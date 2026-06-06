"""
Pydantic schemas for all domain models.
"""

from __future__ import annotations

from datetime import datetime, date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, EmailStr


# ── Vendor ────────────────────────────────────────────────────────────────────
class VendorCreate(BaseModel):
    name: str
    category: Optional[str] = None
    gst_number: Optional[str] = None
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    status: str = "Pending"


class VendorUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    gst_number: Optional[str] = None
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    status: Optional[str] = None


class VendorOut(BaseModel):
    id: int
    name: str
    category: Optional[str]
    gst_number: Optional[str]
    email: Optional[str]
    phone_number: Optional[str]
    status: str
    created_at: Optional[datetime]

    model_config = {"from_attributes": True}


# ── RFQ ───────────────────────────────────────────────────────────────────────
class RFQItemCreate(BaseModel):
    product_name: str
    quantity: int
    category: Optional[str] = None
    units: str


class RFQItemOut(RFQItemCreate):
    id: int
    rfq_id: int
    model_config = {"from_attributes": True}


class RFQCreate(BaseModel):
    title: str
    description: Optional[str] = None
    deadline: datetime
    vendor_ids: list[int] = []
    items: list[RFQItemCreate] = []


class RFQUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    status: Optional[str] = None

class RFQApprove(BaseModel):
    status: str  # "Open" | "Rejected"


class RFQOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    deadline: datetime
    status: str
    created_by: Optional[int]
    created_at: Optional[datetime]
    items: list[RFQItemOut] = []
    vendor_ids: list[int] = []

    model_config = {"from_attributes": True}


# ── Quotation ─────────────────────────────────────────────────────────────────
class QuotationItemCreate(BaseModel):
    product_name: str
    qty: int
    unit_price: Decimal
    total: Decimal


class QuotationItemOut(QuotationItemCreate):
    id: int
    quotation_id: int
    model_config = {"from_attributes": True}


class QuotationCreate(BaseModel):
    rfq_id: int
    vendor_id: int
    total_price: Decimal
    delivery_days: int
    notes: Optional[str] = None
    items: list[QuotationItemCreate] = []


class QuotationApprove(BaseModel):
    status: str  # "Approved" | "Rejected"
    remarks: Optional[str] = None


class QuotationOut(BaseModel):
    id: int
    rfq_id: int
    vendor_id: int
    total_price: Decimal
    delivery_days: int
    notes: Optional[str]
    status: str
    items: list[QuotationItemOut] = []

    model_config = {"from_attributes": True}


# ── Purchase Order ────────────────────────────────────────────────────────────
class PurchaseOrderCreate(BaseModel):
    quotation_id: int


class PurchaseOrderUpdate(BaseModel):
    status: Optional[str] = None


class PurchaseOrderOut(BaseModel):
    id: int
    po_number: str
    quotation_id: int
    status: str
    created_at: Optional[datetime]

    model_config = {"from_attributes": True}


# ── Invoice ───────────────────────────────────────────────────────────────────
class InvoiceCreate(BaseModel):
    po_id: int
    subtotal: Decimal
    gst: Decimal
    grand_total: Decimal
    due_date: Optional[date] = None


class InvoiceUpdate(BaseModel):
    status: Optional[str] = None


class InvoiceOut(BaseModel):
    id: int
    po_id: int
    invoice_number: str
    subtotal: Decimal
    gst: Decimal
    grand_total: Decimal
    status: str
    due_date: Optional[date]

    model_config = {"from_attributes": True}


# ── Activity Log ──────────────────────────────────────────────────────────────
class ActivityLogOut(BaseModel):
    id: int
    user_id: Optional[int]
    action: str
    module: str
    details: Optional[dict]
    created_at: Optional[datetime]

    model_config = {"from_attributes": True}


# ── User (Employee) ───────────────────────────────────────────────────────────
class EmployeeOut(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    role: str
    is_active: bool
    company_name: Optional[str]
    phone_number: Optional[str]
    country: Optional[str]
    created_at: Optional[datetime]

    model_config = {"from_attributes": True}


class EmployeeUpdate(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None
    company_name: Optional[str] = None
