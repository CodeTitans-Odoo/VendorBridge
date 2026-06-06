"""
SQLAlchemy ORM models matching SQL.txt schema exactly.
Table order follows foreign-key dependency.
"""

from sqlalchemy import (
    CheckConstraint,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from app.db.database import Base


# ─── 1. company_employees ────────────────────────────────────────────────────
class CompanyEmployee(Base):
    __tablename__ = "company_employees"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    company_name = Column(String(255))
    role = Column(String(50), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone_number = Column(String(20))
    country = Column(String(100))
    manager_id = Column(
        Integer, ForeignKey("company_employees.id", ondelete="SET NULL")
    )

    # relationships
    rfqs = relationship(
        "RFQ", back_populates="created_by_employee", foreign_keys="RFQ.created_by"
    )
    approvals = relationship("Approval", back_populates="approver")
    activity_logs = relationship("ActivityLog", back_populates="user")


# ─── 2. vendors ──────────────────────────────────────────────────────────────
class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    category = Column(String(100))
    gst_number = Column(String(15), unique=True)
    email = Column(String(255))
    password_hash = Column(String(255), nullable=False, server_default="unknown")
    phone_number = Column(String(20))
    status = Column(String(50), default="Pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    rfq_vendors = relationship("RFQVendor", back_populates="vendor")
    quotations = relationship("Quotation", back_populates="vendor")


# ─── 3. rfqs ─────────────────────────────────────────────────────────────────
class RFQ(Base):
    __tablename__ = "rfqs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    deadline = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(50), default="Draft")
    created_by = Column(
        Integer, ForeignKey("company_employees.id", ondelete="SET NULL")
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    created_by_employee = relationship(
        "CompanyEmployee", back_populates="rfqs", foreign_keys=[created_by]
    )
    items = relationship("RFQItem", back_populates="rfq", cascade="all, delete-orphan")
    rfq_vendors = relationship(
        "RFQVendor", back_populates="rfq", cascade="all, delete-orphan"
    )
    quotations = relationship("Quotation", back_populates="rfq")


# ─── 4. rfq_items ────────────────────────────────────────────────────────────
class RFQItem(Base):
    __tablename__ = "rfq_items"
    __table_args__ = (CheckConstraint("quantity > 0"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    rfq_id = Column(Integer, ForeignKey("rfqs.id", ondelete="CASCADE"))
    product_name = Column(String(255), nullable=False)
    quantity = Column(Integer, nullable=False)
    category = Column(String(100))
    units = Column(String(50), nullable=False)

    rfq = relationship("RFQ", back_populates="items")


# ─── 5. rfq_vendors ──────────────────────────────────────────────────────────
class RFQVendor(Base):
    __tablename__ = "rfq_vendors"
    __table_args__ = (UniqueConstraint("rfq_id", "vendor_id"),)

    rfq_id = Column(
        Integer, ForeignKey("rfqs.id", ondelete="CASCADE"), primary_key=True
    )
    vendor_id = Column(
        Integer, ForeignKey("vendors.id", ondelete="CASCADE"), primary_key=True
    )

    rfq = relationship("RFQ", back_populates="rfq_vendors")
    vendor = relationship("Vendor", back_populates="rfq_vendors")


# ─── 6. quotations ───────────────────────────────────────────────────────────
class Quotation(Base):
    __tablename__ = "quotations"
    __table_args__ = (
        CheckConstraint("total_price >= 0"),
        CheckConstraint("delivery_days >= 0"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    rfq_id = Column(Integer, ForeignKey("rfqs.id", ondelete="CASCADE"))
    vendor_id = Column(Integer, ForeignKey("vendors.id", ondelete="CASCADE"))
    total_price = Column(Numeric(12, 2), nullable=False, default=0.00)
    delivery_days = Column(Integer, nullable=False)
    notes = Column(Text)
    status = Column(String(50), default="Submitted")
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    rfq = relationship("RFQ", back_populates="quotations")
    vendor = relationship("Vendor", back_populates="quotations")
    items = relationship(
        "QuotationItem", back_populates="quotation", cascade="all, delete-orphan"
    )
    approvals = relationship("Approval", back_populates="quotation")
    purchase_orders = relationship("PurchaseOrder", back_populates="quotation")


# ─── 7. quotation_items ───────────────────────────────────────────────────────
class QuotationItem(Base):
    __tablename__ = "quotation_items"
    __table_args__ = (
        CheckConstraint("qty > 0"),
        CheckConstraint("unit_price >= 0"),
        CheckConstraint("total >= 0"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    quotation_id = Column(Integer, ForeignKey("quotations.id", ondelete="CASCADE"))
    product_name = Column(String(255), nullable=False)
    qty = Column(Integer, nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    total = Column(Numeric(12, 2), nullable=False)

    quotation = relationship("Quotation", back_populates="items")


# ─── 8. approvals ────────────────────────────────────────────────────────────
class Approval(Base):
    __tablename__ = "approvals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    quotation_id = Column(Integer, ForeignKey("quotations.id", ondelete="CASCADE"))
    approver_id = Column(
        Integer, ForeignKey("company_employees.id", ondelete="SET NULL")
    )
    status = Column(String(50), default="Pending")
    remarks = Column(Text)
    approved_at = Column(DateTime(timezone=True))
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    quotation = relationship("Quotation", back_populates="approvals")
    approver = relationship("CompanyEmployee", back_populates="approvals")


# ─── 9. purchase_orders ───────────────────────────────────────────────────────
class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    po_number = Column(String(100), unique=True, nullable=False)
    quotation_id = Column(Integer, ForeignKey("quotations.id", ondelete="RESTRICT"))
    status = Column(String(50), default="Pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    quotation = relationship("Quotation", back_populates="purchase_orders")
    invoices = relationship("Invoice", back_populates="purchase_order")


# ─── 10. invoices ─────────────────────────────────────────────────────────────
class Invoice(Base):
    __tablename__ = "invoices"
    __table_args__ = (
        CheckConstraint("subtotal >= 0"),
        CheckConstraint("gst >= 0"),
        CheckConstraint("grand_total >= 0"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    po_id = Column(Integer, ForeignKey("purchase_orders.id", ondelete="RESTRICT"))
    invoice_number = Column(String(100), unique=True, nullable=False)
    subtotal = Column(Numeric(12, 2), nullable=False)
    gst = Column(Numeric(12, 2), nullable=False)
    grand_total = Column(Numeric(12, 2), nullable=False)
    status = Column(String(50), default="Unpaid")
    due_date = Column(Date)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    purchase_order = relationship("PurchaseOrder", back_populates="invoices")


# ─── 11. activity_logs ───────────────────────────────────────────────────────
class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer, ForeignKey("company_employees.id", ondelete="SET NULL")
    )
    action = Column(String(255), nullable=False)
    module = Column(String(100), nullable=False)
    details = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("CompanyEmployee", back_populates="activity_logs")
