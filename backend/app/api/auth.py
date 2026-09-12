import uuid
import hashlib
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from database import get_db, User, Role, AuditLog
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["auth"])

def hash_pw(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

class LoginRequest(BaseModel):
    userId: str
    password: Optional[str] = "secret"

class SignupRequest(BaseModel):
    username: str
    fullName: Optional[str] = ""
    password: str
    role: Optional[str] = "Engineer"
    email: Optional[str] = ""

@router.post("/signup")
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    u_name = payload.username.strip().lower()
    if not u_name:
        raise HTTPException(status_code=400, detail="Username is required")
    if not payload.password.strip():
        raise HTTPException(status_code=400, detail="Password is required")

    # Check if user already exists
    existing = db.query(User).filter(User.username == u_name).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists with this username")

    user_id = str(uuid.uuid4())
    email = payload.email.strip().lower() if payload.email.strip() else f"{u_name}@company.local"
    full_name = payload.fullName.strip() if payload.fullName.strip() else u_name.title()
    selected_role = payload.role or "Engineer"

    # Find or create role
    role_obj = db.query(Role).filter(Role.name == selected_role).first()
    if not role_obj:
        role_obj = Role(id=str(uuid.uuid4()), name=selected_role, description=f"{selected_role} role")
        db.add(role_obj)
        db.commit()

    new_user = User(
        id=user_id,
        username=u_name,
        email=email,
        full_name=full_name,
        hashed_password=hash_pw(payload.password.strip()),
        department="Operations",
        is_active=True,
        created_at=datetime.utcnow()
    )
    new_user.roles.append(role_obj)
    db.add(new_user)
    db.commit()

    # Audit log
    try:
        db.add(AuditLog(
            user_id=user_id,
            action="User registered account",
            resource="/auth/signup",
            status="success",
            risk_level="low",
            details=f"New user {full_name} ({selected_role}) created account."
        ))
        db.commit()
    except Exception:
        db.rollback()

    return {
        "success": True,
        "user": {
            "id": user_id,
            "name": full_name,
            "role": selected_role,
            "username": u_name,
            "email": email
        }
    }

@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    u_raw = payload.userId.strip()
    u_lower = u_raw.lower()
    pw = (payload.password or "").strip()

    # Search user by username, email, or id
    user = db.query(User).filter(
        (User.username == u_lower) | (User.email == u_lower) | (User.id == u_raw)
    ).first()

    if user:
        # Verify password if hashed_password matches
        input_hash = hash_pw(pw)
        # Allow demo passwords or matching hashes
        if user.hashed_password and user.hashed_password != input_hash and pw not in ["secret", "demo_password", "admin", "123456"]:
            # If standard password didn't match, return error
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        role_name = user.roles[0].name if user.roles else "Engineer"
        display_name = user.full_name or user.username
        user_id = user.id
    else:
        # If user not in DB, auto-register as guest/engineer or authenticate demo profile
        role_name = "Engineer"
        if "admin" in u_lower:
            role_name = "Administrator"
        elif "safety" in u_lower:
            role_name = "Safety Officer"
        elif "manager" in u_lower:
            role_name = "Manager"

        display_name = "Pari" if "pari" in u_lower else u_raw
        user_id = str(uuid.uuid4())

        # Save to DB so user persists
        try:
            role_obj = db.query(Role).filter(Role.name == role_name).first()
            if not role_obj:
                role_obj = Role(id=str(uuid.uuid4()), name=role_name, description=f"{role_name} role")
                db.add(role_obj)
                db.commit()

            new_u = User(
                id=user_id,
                username=u_lower,
                email=f"{u_lower}@company.local",
                full_name=display_name,
                hashed_password=hash_pw(pw or "secret"),
                department="Operations",
                is_active=True
            )
            new_u.roles.append(role_obj)
            db.add(new_u)
            db.commit()
        except Exception:
            db.rollback()

    # Record login in audit log
    try:
        log_entry = AuditLog(
            user_id=user_id,
            action="User signed in",
            resource="/auth/login",
            status="success",
            risk_level="low",
            details=f"User {display_name} ({role_name}) logged in."
        )
        db.add(log_entry)
        db.commit()
    except Exception:
        db.rollback()

    return {
        "success": True,
        "user": {
            "id": user_id,
            "name": display_name,
            "role": role_name,
            "username": u_lower
        }
    }

@router.post("/logout")
def logout():
    return {"success": True}

