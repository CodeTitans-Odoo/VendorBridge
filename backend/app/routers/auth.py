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
from app.db.database import get_db
from app.db.models import CompanyEmployee
from app.models.user import UserCreate, UserOut, Token

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(
    payload: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    from app.db.models import Vendor, CompanyEmployee

    email_lower = payload.email.lower()

    # Check duplicate in both tables
    existing_emp = await db.execute(
        select(CompanyEmployee).where(CompanyEmployee.email == email_lower)
    )
    existing_vend = await db.execute(
        select(Vendor).where(Vendor.email == email_lower)
    )
    
    if existing_emp.scalar_one_or_none() or existing_vend.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    if payload.role == "vendor":
        # Create Vendor only
        new_user = Vendor(
            name=payload.company_name or f"{payload.first_name} {payload.last_name}",
            category=getattr(payload, "category", None),
            gst_number=getattr(payload, "gst_number", None),
            email=email_lower,
            phone_number=getattr(payload, "phone", None),
            status="Active",
            password_hash=hash_password(payload.password),
        )
    else:
        # Create Employee only
        new_user = CompanyEmployee(
            email=email_lower,
            password_hash=hash_password(payload.password),
            first_name=payload.first_name,
            last_name=payload.last_name,
            role=payload.role,
            phone_number=getattr(payload, "phone", None),
            country=getattr(payload, "country", None),
            company_name=getattr(payload, "company_name", None),
        )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    if payload.role == "vendor":
        return UserOut(
            id=str(new_user.id),
            email=new_user.email,
            first_name=payload.first_name,  # Vendor model only has 'name' in SQL.txt
            last_name=payload.last_name,
            role="vendor",
            company_name=new_user.name,
        )
    else:
        return UserOut(
            id=str(new_user.id),
            email=new_user.email,
            first_name=new_user.first_name,
            last_name=new_user.last_name,
            role=new_user.role,
            company_name=new_user.company_name,
        )


@router.post("/login", response_model=Token)
async def login(
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    from app.db.models import Vendor, CompanyEmployee

    email_lower = form.username.lower()

    # Check employee first
    result = await db.execute(
        select(CompanyEmployee).where(CompanyEmployee.email == email_lower)
    )
    employee = result.scalar_one_or_none()

    user = None
    role = None
    
    if employee:
        user = employee
        role = employee.role
    else:
        # Check vendor
        result_v = await db.execute(
            select(Vendor).where(Vendor.email == email_lower)
        )
        vendor = result_v.scalar_one_or_none()
        if vendor:
            user = vendor
            role = "vendor"

    # We need to verify password against user.password_hash
    if not user or not hasattr(user, "password_hash") or not verify_password(form.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token({"sub": str(user.id), "role": role})
    
    first_name = getattr(user, "first_name", "")
    last_name = getattr(user, "last_name", "")
    company_name = getattr(user, "company_name", getattr(user, "name", None))
    
    if role == "vendor" and not first_name:
        parts = getattr(user, "name", "").split(" ", 1)
        first_name = parts[0] if parts else ""
        last_name = parts[1] if len(parts) > 1 else ""

    return Token(
        access_token=token,
        token_type="bearer",
        user=UserOut(
            id=str(user.id),
            email=user.email,
            first_name=first_name,
            last_name=last_name,
            role=role,
            company_name=company_name,
        ),
    )


@router.get("/me", response_model=UserOut)
async def me(current_user: Annotated[dict, Depends(get_current_user)]):
    # current_user could be Vendor or CompanyEmployee now, depends on what get_current_user returns
    return current_user
