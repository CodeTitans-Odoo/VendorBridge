"""
RFQs — create with items and vendor assignments, list, detail, update.
"""

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_vendor_id, require_role
from app.db.database import get_db
from app.db.models import CompanyEmployee, RFQ, RFQItem, RFQVendor
from app.models.schemas import RFQCreate, RFQOut, RFQUpdate, RFQApprove

router = APIRouter(prefix="/api/rfqs", tags=["RFQs"])


@router.get("/", response_model=list[RFQOut])
async def list_rfqs(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        CompanyEmployee, Depends(require_role("officer", "manager", "admin", "vendor"))
    ],
    vendor_id: Annotated[int | None, Depends(get_vendor_id)],
    rfq_status: Optional[str] = Query(None, alias="status"),
    skip: int = 0,
    limit: int = 50,
):
    q = (
        select(RFQ)
        .options(selectinload(RFQ.items), selectinload(RFQ.rfq_vendors))
        .order_by(RFQ.created_at.desc())
    )
    if rfq_status:
        q = q.where(RFQ.status == rfq_status)
        
    if vendor_id:
        q = q.join(RFQVendor).where(RFQVendor.vendor_id == vendor_id).where(RFQ.status == "Open")
        
    q = q.offset(skip).limit(limit)
    result = await db.execute(q)
    rfqs = result.scalars().all()
    return [_rfq_to_out(r) for r in rfqs]


@router.post("/", response_model=RFQOut, status_code=status.HTTP_201_CREATED)
async def create_rfq(
    payload: RFQCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[CompanyEmployee, Depends(require_role("officer"))],
):
    rfq = RFQ(
        title=payload.title,
        description=payload.description,
        deadline=payload.deadline,
        status="Pending Approval",
        created_by=current_user.id,
    )
    db.add(rfq)
    await db.flush()  # get rfq.id

    for item in payload.items:
        db.add(RFQItem(rfq_id=rfq.id, **item.model_dump()))

    for vendor_id in payload.vendor_ids:
        db.add(RFQVendor(rfq_id=rfq.id, vendor_id=vendor_id))

    await db.commit()
    await db.refresh(rfq)

    # reload with relationships
    result = await db.execute(
        select(RFQ)
        .options(selectinload(RFQ.items), selectinload(RFQ.rfq_vendors))
        .where(RFQ.id == rfq.id)
    )
    return _rfq_to_out(result.scalar_one())


@router.get("/{rfq_id}", response_model=RFQOut)
async def get_rfq(
    rfq_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[
        CompanyEmployee, Depends(require_role("officer", "manager", "admin", "vendor"))
    ],
):
    result = await db.execute(
        select(RFQ)
        .options(selectinload(RFQ.items), selectinload(RFQ.rfq_vendors))
        .where(RFQ.id == rfq_id)
    )
    rfq = result.scalar_one_or_none()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    return _rfq_to_out(rfq)


@router.put("/{rfq_id}", response_model=RFQOut)
async def update_rfq(
    rfq_id: int,
    payload: RFQUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CompanyEmployee, Depends(require_role("officer"))],
):
    rfq = await db.get(RFQ, rfq_id)
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(rfq, k, v)
    await db.commit()
    await db.refresh(rfq)
    result = await db.execute(
        select(RFQ)
        .options(selectinload(RFQ.items), selectinload(RFQ.rfq_vendors))
        .where(RFQ.id == rfq.id)
    )
    return _rfq_to_out(result.scalar_one())

@router.post("/{rfq_id}/approve", response_model=RFQOut)
async def approve_rfq(
    rfq_id: int,
    payload: RFQApprove,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CompanyEmployee, Depends(require_role("manager", "admin"))],
):
    rfq = await db.get(RFQ, rfq_id)
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    
    rfq.status = payload.status
    await db.commit()
    await db.refresh(rfq)
    
    result = await db.execute(
        select(RFQ)
        .options(selectinload(RFQ.items), selectinload(RFQ.rfq_vendors))
        .where(RFQ.id == rfq.id)
    )
    return _rfq_to_out(result.scalar_one())


@router.delete("/{rfq_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rfq(
    rfq_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CompanyEmployee, Depends(require_role("officer", "admin"))],
):
    rfq = await db.get(RFQ, rfq_id)
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    await db.delete(rfq)
    await db.commit()


def _rfq_to_out(rfq: RFQ) -> RFQOut:
    return RFQOut(
        id=rfq.id,
        title=rfq.title,
        description=rfq.description,
        deadline=rfq.deadline,
        status=rfq.status,
        created_by=rfq.created_by,
        created_at=rfq.created_at,
        items=[i.__dict__ for i in rfq.items],
        vendor_ids=[v.vendor_id for v in rfq.rfq_vendors],
    )
