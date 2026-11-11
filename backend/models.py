from sqlalchemy import Column, Integer, String, Date, Text, Boolean, DateTime
from sqlalchemy.sql import func
from database import Base

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(80), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    phone = Column(String(20), unique=True, index=True,nullable=False)
    date_of_birth = Column(Date, nullable=False)
    job_title = Column(String(80), nullable=False)
    gender = Column(String(15), nullable=False)
    address = Column(Text, nullable=True)
    terms_accepted = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
