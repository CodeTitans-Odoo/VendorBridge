"""
Quotations — vendor submission, officer comparison, manager approval.
"""

from datetime import datetime, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_vendor_id, require_role
from app.db.database import get_db
from app.db.models import Approval, CompanyEmployee, Quotation, QuotationItem, Vendor, RFQ
import logging

logger = logging.getLogger(__name__)
from app.models.schemas import QuotationApprove, QuotationCreate, QuotationOut

router = APIRouter(prefix="/api/quotations", tags=["Quotations"])


@router.get("/", response_model=list[QuotationOut])
async def list_quotations(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[
        CompanyEmployee, Depends(require_role("officer", "manager", "admin", "vendor"))
    ],
    current_vendor_id: Annotated[int | None, Depends(get_vendor_id)],
    rfq_id: Optional[int] = Query(None),
    vendor_id: Optional[int] = Query(None),
    skip: int = 0,
    limit: int = 50,
):
    q = (
        select(Quotation)
        .options(selectinload(Quotation.items))
    )
    if rfq_id:
        q = q.where(Quotation.rfq_id == rfq_id)
        
    # If the user is a vendor, forcefully override vendor_id filter to their own
    if current_vendor_id is not None:
        vendor_id = current_vendor_id
        
    if vendor_id:
        q = q.where(Quotation.vendor_id == vendor_id)
        
    q = q.offset(skip).limit(limit)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/", response_model=QuotationOut, status_code=status.HTTP_201_CREATED)
async def submit_quotation(
    payload: QuotationCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CompanyEmployee, Depends(require_role("vendor"))],
    current_vendor_id: Annotated[int | None, Depends(get_vendor_id)],
):
    if current_vendor_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Only vendors can submit quotations"
        )
    
    # Override payload's vendor_id to prevent mismatch
    payload.vendor_id = current_vendor_id
        
    quot = Quotation(
        rfq_id=payload.rfq_id,
        vendor_id=payload.vendor_id,
        total_price=payload.total_price,
        delivery_days=payload.delivery_days,
        notes=payload.notes,
        status="Submitted",
    )
    db.add(quot)
    await db.flush()
    for item in payload.items:
        db.add(QuotationItem(quotation_id=quot.id, **item.model_dump()))
    await db.commit()
    await db.refresh(quot)
    result = await db.execute(
        select(Quotation)
        .options(selectinload(Quotation.items))
        .where(Quotation.id == quot.id)
    )
    return result.scalar_one()


@router.get("/{rfq_id}/compare", response_model=list[QuotationOut])
async def compare_quotations(
    rfq_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CompanyEmployee, Depends(require_role("officer", "manager", "admin"))],
):
    result = await db.execute(
        select(Quotation)
        .options(selectinload(Quotation.items))
        .where(Quotation.rfq_id == rfq_id)
    )
    return result.scalars().all()


@router.post("/{quotation_id}/approve", response_model=dict)
async def approve_quotation(
    quotation_id: int,
    payload: QuotationApprove,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[CompanyEmployee, Depends(require_role("officer", "admin"))],
):
    quot = await db.get(Quotation, quotation_id)
    if not quot:
        raise HTTPException(status_code=404, detail="Quotation not found")

    quot.status = payload.status
    approval = Approval(
        quotation_id=quotation_id,
        approver_id=current_user.id,
        status=payload.status,
        remarks=payload.remarks,
        approved_at=datetime.now(timezone.utc)
        if payload.status == "Approved"
        else None,
    )
    db.add(approval)
    await db.commit()

    # Send Email Notification
    vendor_obj = await db.get(Vendor, quot.vendor_id)
    rfq_obj = await db.get(RFQ, quot.rfq_id)
    
    if rfq_obj and vendor_obj:
        officer = await db.get(CompanyEmployee, rfq_obj.created_by)
        manager = None
        if officer and officer.manager_id:
            manager = await db.get(CompanyEmployee, officer.manager_id)
        
        emails_to_notify = []
        if vendor_obj.email:
            emails_to_notify.append(vendor_obj.email)
        if officer and officer.email:
            emails_to_notify.append(officer.email)
        if manager and manager.email:
            emails_to_notify.append(manager.email)
            
        if emails_to_notify:
            from app.core.email_service import send_approval_notification
            
            subject = f"Quotation {payload.status} - RFQ: {rfq_obj.title}"
            await send_approval_notification(
                to_emails=emails_to_notify,
                subject=subject,
                vendor_name=vendor_obj.name,
                rfq_title=rfq_obj.title,
                status=payload.status
            )

    return {"message": f"Quotation {payload.status}", "quotation_id": quotation_id}


@router.get("/detail/{quotation_id}", response_model=QuotationOut)
async def get_quotation(
    quotation_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[
        CompanyEmployee, Depends(require_role("officer", "manager", "admin", "vendor"))
    ],
):
    result = await db.execute(
        select(Quotation)
        .options(selectinload(Quotation.items))
        .where(Quotation.id == quotation_id)
    )
    quot = result.scalar_one_or_none()
    if not quot:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return quot
