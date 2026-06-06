"""
Purchase Orders — generate from approved quotation, approve/reject.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_vendor_id, require_role
from app.db.database import get_db
from app.db.models import CompanyEmployee, PurchaseOrder, Quotation
from app.models.schemas import (
    PurchaseOrderCreate,
    PurchaseOrderOut,
    PurchaseOrderUpdate,
)

router = APIRouter(prefix="/api/purchase-orders", tags=["Purchase Orders"])


@router.get("/", response_model=list[PurchaseOrderOut])
async def list_purchase_orders(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[
        CompanyEmployee, Depends(require_role("officer", "manager", "admin", "vendor"))
    ],
    current_vendor_id: Annotated[int | None, Depends(get_vendor_id)],
    skip: int = 0,
    limit: int = 50,
):
    q = select(PurchaseOrder).order_by(PurchaseOrder.created_at.desc())
    
    if current_vendor_id is not None:
        q = q.join(Quotation).where(Quotation.vendor_id == current_vendor_id)
        
    q = q.offset(skip).limit(limit)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/", response_model=PurchaseOrderOut, status_code=status.HTTP_201_CREATED)
async def create_purchase_order(
    payload: PurchaseOrderCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CompanyEmployee, Depends(require_role("officer"))],
):
    quot = await db.get(Quotation, payload.quotation_id)
    if not quot:
        raise HTTPException(status_code=404, detail="Quotation not found")
    if quot.status != "Approved":
        raise HTTPException(status_code=400, detail="Quotation must be Approved first")

    po = PurchaseOrder(
        po_number=f"PO-{uuid.uuid4().hex[:8].upper()}",
        quotation_id=payload.quotation_id,
        status="Pending",
    )
    db.add(po)
    await db.commit()
    await db.refresh(po)
    return po


@router.post("/{po_id}/approve", response_model=PurchaseOrderOut)
async def approve_purchase_order(
    po_id: int,
    payload: PurchaseOrderUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CompanyEmployee, Depends(require_role("manager", "admin"))],
):
    po = await db.get(PurchaseOrder, po_id)
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
    po.status = payload.status or "Approved"
    await db.commit()
    await db.refresh(po)
    return po


@router.get("/{po_id}", response_model=PurchaseOrderOut)
async def get_purchase_order(
    po_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[
        CompanyEmployee, Depends(require_role("officer", "manager", "admin", "vendor"))
    ],
):
    po = await db.get(PurchaseOrder, po_id)
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
    return po
