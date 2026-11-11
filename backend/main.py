import os
import io
import json
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles  # <-- Added for mounting
from fastapi.responses import FileResponse  # <-- Added for serving index.html
from sqlalchemy.orm import Session
from typing import List, Optional
import models
import schemas
from database import engine, get_db

# Create DB tables automatically on startup
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Employee Registration Portal", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── FRONTEND MOUNTING ───
# Tells FastAPI to serve styles.css and app.js from the /static folder
app.mount("/static", StaticFiles(directory="static"), name="static")

# ─── FRONTEND WEB ROUTE ───
# Serves your main index.html webpage directly when you open http://localhost:8000
@app.get("/")
def read_root():
    return FileResponse("static/index.html")

# ─── DATABASE CRUD ROUTES ───

# 1. CREATE (POST)
@app.post("/api/employees", response_model=schemas.EmployeeOut, status_code=status.HTTP_201_CREATED)
def register_employee(employee: schemas.EmployeeCreate, db: Session = Depends(get_db)):
    # Check duplicate email
    existing_email = db.query(models.Employee).filter(models.Employee.email == employee.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An employee with this email address already exists."
        )

    # Check duplicate phone number
    existing_phone = db.query(models.Employee).filter(models.Employee.phone == employee.phone).first()
    if existing_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An employee with this phone number already exists."
        )

    db_employee = models.Employee(**employee.model_dump())
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)
    return db_employee

# 2. READ ALL (GET with live search)
@app.get("/api/employees", response_model=List[schemas.EmployeeOut])
def get_all_employees(search: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Employee)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            (models.Employee.full_name.ilike(term)) |
            (models.Employee.email.ilike(term)) |
            (models.Employee.job_title.ilike(term))
        )
    return query.order_by(models.Employee.id.desc()).all()

# 3. READ SINGLE (GET by ID)
@app.get("/api/employees/{emp_id}", response_model=schemas.EmployeeOut)
def get_single_employee(emp_id: int, db: Session = Depends(get_db)):
    emp = db.query(models.Employee).filter(models.Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found.")
    return emp

# 4. UPDATE (PUT)
@app.put("/api/employees/{emp_id}", response_model=schemas.EmployeeOut)
def update_employee(emp_id: int, payload: schemas.EmployeeUpdate, db: Session = Depends(get_db)):
    emp = db.query(models.Employee).filter(models.Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found.")
    
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(emp, field, value)
    db.commit()
    db.refresh(emp)
    return emp

# 5. DELETE (DELETE)
@app.delete("/api/employees/{emp_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(emp_id: int, db: Session = Depends(get_db)):
    emp = db.query(models.Employee).filter(models.Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found.")
    db.delete(emp)
    db.commit()
    return None
