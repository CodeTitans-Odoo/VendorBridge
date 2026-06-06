"""
FastAPI dependency — returns current authenticated CompanyEmployee from DB.
"""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db.database import get_db
from app.db.models import CompanyEmployee

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CompanyEmployee:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exc

    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise credentials_exc

    result = await db.execute(
        select(CompanyEmployee).where(CompanyEmployee.id == int(user_id))
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exc
    return user


def require_role(*roles: str):
    """Factory — returns a dependency that enforces one of the given roles."""

    async def checker(
        current_user: Annotated[CompanyEmployee, Depends(get_current_user)],
    ) -> CompanyEmployee:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires role: {' or '.join(roles)}",
            )
        return current_user

    return checker


# Convenience aliases
OfficerOrAbove = require_role("officer", "manager", "admin")
ManagerOrAbove = require_role("manager", "admin")
AdminOnly = require_role("admin")

async def get_vendor_id(
    current_user: Annotated[CompanyEmployee, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> int | None:
    """Returns the Vendor.id if the current user is a vendor."""
    if current_user.role != "vendor":
        return None
    from app.db.models import Vendor
    result = await db.execute(select(Vendor).where(Vendor.email == current_user.email))
    vendor = result.scalar_one_or_none()
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="No vendor profile linked to this account."
        )
    return vendor.id
