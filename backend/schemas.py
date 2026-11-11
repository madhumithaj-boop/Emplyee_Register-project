from pydantic import BaseModel, Field, field_validator
from datetime import date, datetime
from typing import Optional, Literal
import re

ALLOWED_ROLES = [
    "AI/ML Engineer",
    "Software Engineer",
    "Frontend Developer",
    "Data Analyst",
    "Product Manager",
    "HR Specialist",
    "UI/UX Designer"
]

class EmployeeBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=80)
    email: str = Field(...)
    phone: str = Field(...)
    date_of_birth: date
    job_title: str
    gender: Literal["Male", "Female", "Other"]
    address: Optional[str] = Field(None, max_length=500)
    terms_accepted: bool

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        clean = v.strip()
        if not re.match(r"^[A-Za-z\s'\-]{2,80}$", clean):
            raise ValueError("Name must be 2–80 letters without numbers or special symbols.")
        return clean

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        clean = v.strip().lower()
        if not re.match(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", clean):
            raise ValueError("Please provide a valid corporate email address.")
        return clean

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        clean = v.strip()
        digits = re.sub(r"\D", "", clean)
        if len(digits) < 10 or len(digits) > 15:
            raise ValueError("Phone number must contain between 10 and 15 digits.")
        return clean

    @field_validator("date_of_birth")
    @classmethod
    def validate_dob(cls, v: date) -> date:
        today = date.today()
        if v >= today:
            raise ValueError("Date of birth must be in the past.")
        age = today.year - v.year - ((today.month, today.day) < (v.month, v.day))
        if age < 18 or age > 75:
            raise ValueError("Employee must be between 18 and 75 years of age.")
        return v

    @field_validator("job_title")
    @classmethod
    def validate_job(cls, v: str) -> str:
        clean = v.strip()
        if clean not in ALLOWED_ROLES:
            raise ValueError(f"Job title must be one of: {', '.join(ALLOWED_ROLES)}")
        return clean

    @field_validator("terms_accepted")
    @classmethod
    def validate_terms(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Verification terms must be accepted.")
        return v

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    job_title: Optional[str] = None

class EmployeeOut(EmployeeBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
