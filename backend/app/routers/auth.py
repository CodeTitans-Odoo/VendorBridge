"""
Auth router — register, login, get current user.
Now backed by PostgreSQL via SQLAlchemy.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.core.security import hash_password, verify_password, create_access_token
from app.core.email_service import store_otp, verify_otp, send_otp_email
from app.db.database import get_db
from app.db.models import CompanyEmployee
from app.models.user import UserCreate, UserOut, Token

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(
    payload: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    # Check duplicate
    existing = await db.execute(
        select(CompanyEmployee).where(CompanyEmployee.email == payload.email.lower())
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    employee = CompanyEmployee(
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        first_name=payload.first_name,
        last_name=payload.last_name,
        role=payload.role,
        phone_number=getattr(payload, "phone", None),
        country=getattr(payload, "country", None),
        company_name=getattr(payload, "company_name", None),
    )
    db.add(employee)
    await db.flush()  # get employee.id without committing

    # If role is vendor, also create the Vendor record
    if payload.role == "vendor":
        from app.db.models import Vendor

        vendor_record = Vendor(
            name=payload.company_name or f"{payload.first_name} {payload.last_name}",
            category=getattr(payload, "category", None),
            gst_number=getattr(payload, "gst_number", None),
            email=payload.email.lower(),
            phone_number=getattr(payload, "phone", None),
            status="Pending",
        )
        db.add(vendor_record)

    await db.commit()
    await db.refresh(employee)

    return UserOut(
        id=str(employee.id),
        email=employee.email,
        first_name=employee.first_name,
        last_name=employee.last_name,
        role=employee.role,
        company_name=employee.company_name,
    )


@router.post("/login", response_model=Token)
async def login(
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(CompanyEmployee).where(CompanyEmployee.email == form.username.lower())
    )
    employee = result.scalar_one_or_none()

    if not employee or not verify_password(form.password, employee.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token({"sub": str(employee.id), "role": employee.role})
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserOut(
            id=str(employee.id),
            email=employee.email,
            first_name=employee.first_name,
            last_name=employee.last_name,
            role=employee.role,
            company_name=employee.company_name,
        ),
    )


@router.get("/me", response_model=UserOut)
async def me(current_user: Annotated[CompanyEmployee, Depends(get_current_user)]):
    return UserOut(
        id=str(current_user.id),
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        role=current_user.role,
        company_name=current_user.company_name,
    )


from pydantic import BaseModel

class ForgotPasswordRequest(BaseModel):
    email: str

class VerifyOTPRequest(BaseModel):
    email: str
    otp: str
    new_password: str


@router.post("/forgot-password")
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Generate OTP and email it. Always return 200 to avoid email enumeration."""
    result = await db.execute(
        select(CompanyEmployee).where(CompanyEmployee.email == payload.email.lower())
    )
    employee = result.scalar_one_or_none()

    if employee:
        otp = store_otp(payload.email)
        await send_otp_email(
            to_email=payload.email,
            otp=otp,
            user_name=employee.first_name
        )

    return {"message": "If this email exists, an OTP has been sent."}


@router.post("/verify-otp", response_model=Token)
async def verify_otp_and_reset(
    payload: VerifyOTPRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Verify OTP and reset password, return a new JWT token."""
    if not verify_otp(payload.email, payload.otp):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP"
        )

    result = await db.execute(
        select(CompanyEmployee).where(CompanyEmployee.email == payload.email.lower())
    )
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="User not found")

    employee.password_hash = hash_password(payload.new_password)
    await db.commit()
    await db.refresh(employee)

    token = create_access_token({"sub": str(employee.id), "role": employee.role})
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserOut(
            id=str(employee.id),
            email=employee.email,
            first_name=employee.first_name,
            last_name=employee.last_name,
            role=employee.role,
            company_name=employee.company_name,
        ),
    )
