"""
API Gateway — auth_routes.py
Implements login and registration endpoints against the central Postgres users table.
"""

from __future__ import annotations

from uuid import uuid4

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from jose import jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, constr
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from config import Settings
from db import get_db

settings = Settings()
router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _hash_password(password: str) -> str:
    """Hash password, truncating to 72 bytes to work around passlib/bcrypt Python 3.12 issue."""
    return pwd_context.hash(password[:72])


def _verify_password(password: str, password_hash: str) -> bool:
    """Verify password, truncating to 72 bytes to match how it was hashed."""
    return pwd_context.verify(password[:72], password_hash)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: constr(min_length=8)
    name: str
    role: constr(pattern="^(citizen|volunteer|authority|admin)$")
    phone: str
    preferred_language: str = 'en'


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    role: str
    user_id: str


class AdminUserResponse(BaseModel):
    id: str
    name: str
    email: str | None = None
    phone: str
    role: str
    preferred_language: str
    created_at: datetime


class AdminUserCreateRequest(BaseModel):
    email: EmailStr
    password: constr(min_length=8)
    name: str
    role: constr(pattern="^(citizen|volunteer|authority|admin)$")
    phone: str
    preferred_language: str = 'en'


@router.post('/api/auth/login', response_model=AuthResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> AuthResponse:
    result = await db.execute(
        text('SELECT id, role, password_hash FROM users WHERE email = :email LIMIT 1'),
        {'email': payload.email.lower().strip()},
    )
    row = result.mappings().first()
    if not row or not row['password_hash']:
        raise HTTPException(status_code=401, detail='Invalid credentials')

    if not _verify_password(payload.password, row['password_hash']):
        raise HTTPException(status_code=401, detail='Invalid credentials')

    token = jwt.encode(
        {'sub': str(row['id']), 'role': row['role']},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )

    return AuthResponse(
        access_token=token,
        role=row['role'],
        user_id=str(row['id']),
    )


@router.post('/api/auth/register', response_model=AuthResponse)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)) -> AuthResponse:
    if payload.role == 'admin' and not settings.allow_admin_registration:
        raise HTTPException(status_code=403, detail='Admin registration is disabled')

    existing = await db.execute(
        text('SELECT id FROM users WHERE email = :email LIMIT 1'),
        {'email': payload.email.lower().strip()},
    )
    if existing.first():
        raise HTTPException(status_code=409, detail='Email already exists')

    user_id = str(uuid4())
    password_hash = _hash_password(payload.password)

    await db.execute(
        text(
            '''INSERT INTO users
            (id, role, name, phone, email, preferred_language, auth_provider_id, password_hash)
            VALUES
            (:id, :role, :name, :phone, :email, :preferred_language, :auth_provider_id, :password_hash)'''
        ),
        {
            'id': user_id,
            'role': payload.role,
            'name': payload.name.strip(),
            'phone': payload.phone.strip(),
            'email': payload.email.lower().strip(),
            'preferred_language': payload.preferred_language.strip() or 'en',
            'auth_provider_id': f'local-{payload.role}-{user_id[:8]}',
            'password_hash': password_hash,
        },
    )

    if payload.role == 'volunteer':
        await db.execute(
            text(
                "INSERT INTO volunteer_profiles (user_id, skills, availability_status) VALUES (:id, ARRAY[]::text[], 'available')",
            ),
            {'id': user_id},
        )
    elif payload.role == 'authority':
        await db.execute(
            text(
                "INSERT INTO authorities (user_id, department, managed_districts) VALUES (:id, '', ARRAY[]::text[])",
            ),
            {'id': user_id},
        )
    elif payload.role == 'admin':
        await db.execute(
            text(
                "INSERT INTO admins (user_id, title) VALUES (:id, 'Platform Admin')",
            ),
            {'id': user_id},
        )

    await db.commit()

    token = jwt.encode(
        {'sub': user_id, 'role': payload.role},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )

    return AuthResponse(
        access_token=token,
        role=payload.role,
        user_id=user_id,
    )


def _ensure_admin(request: Request) -> None:
    if getattr(request.state, 'role', None) != 'admin':
        raise HTTPException(status_code=403, detail='Admin access required')


@router.get('/api/admin/users', response_model=list[AdminUserResponse])
async def list_admin_users(request: Request, db: AsyncSession = Depends(get_db)) -> list[AdminUserResponse]:
    _ensure_admin(request)
    result = await db.execute(
        text(
            '''SELECT id, name, email, phone, role::text AS role, preferred_language, created_at
            FROM users
            ORDER BY created_at DESC
            LIMIT 200'''
        )
    )
    rows = result.mappings().all()
    return [AdminUserResponse(**row) for row in rows]


@router.post('/api/admin/users', response_model=AdminUserResponse)
async def create_admin_user(payload: AdminUserCreateRequest, request: Request, db: AsyncSession = Depends(get_db)) -> AdminUserResponse:
    _ensure_admin(request)

    existing = await db.execute(
        text('SELECT id FROM users WHERE email = :email LIMIT 1'),
        {'email': payload.email.lower().strip()},
    )
    if existing.first():
        raise HTTPException(status_code=409, detail='Email already exists')

    user_id = str(uuid4())
    password_hash = pwd_context.hash(payload.password)

    await db.execute(
        text(
            '''INSERT INTO users
            (id, role, name, phone, email, preferred_language, auth_provider_id, password_hash)
            VALUES
            (:id, :role, :name, :phone, :email, :preferred_language, :auth_provider_id, :password_hash)'''
        ),
        {
            'id': user_id,
            'role': payload.role,
            'name': payload.name.strip(),
            'phone': payload.phone.strip(),
            'email': payload.email.lower().strip(),
            'preferred_language': payload.preferred_language.strip() or 'en',
            'auth_provider_id': f'local-{payload.role}-{user_id[:8]}',
            'password_hash': password_hash,
        },
    )

    if payload.role == 'volunteer':
        await db.execute(
            text(
                "INSERT INTO volunteer_profiles (user_id, skills, availability_status) VALUES (:id, ARRAY[]::text[], 'available')",
            ),
            {'id': user_id},
        )
    elif payload.role == 'authority':
        await db.execute(
            text(
                "INSERT INTO authorities (user_id, department, managed_districts) VALUES (:id, '', ARRAY[]::text[])",
            ),
            {'id': user_id},
        )
    elif payload.role == 'admin':
        await db.execute(
            text(
                "INSERT INTO admins (user_id, title) VALUES (:id, 'Platform Admin')",
            ),
            {'id': user_id},
        )

    await db.commit()

    created = await db.execute(
        text('SELECT created_at FROM users WHERE id = :id'),
        {'id': user_id},
    )
    created_at = created.scalar_one()

    return AdminUserResponse(
        id=user_id,
        name=payload.name.strip(),
        email=payload.email.lower().strip(),
        phone=payload.phone.strip(),
        role=payload.role,
        preferred_language=payload.preferred_language.strip() or 'en',
        created_at=created_at,
    )


@router.delete('/api/admin/users/{user_id}', status_code=204)
async def delete_admin_user(user_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    _ensure_admin(request)
    if user_id == getattr(request.state, 'user_id', None):
        raise HTTPException(status_code=403, detail='Cannot delete own admin account')

    result = await db.execute(
        text('DELETE FROM users WHERE id = :id'),
        {'id': user_id},
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail='User not found')

    await db.commit()
    return Response(status_code=204)
