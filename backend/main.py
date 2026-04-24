import os
import json
import logging
import hashlib
import io
import re
import random
from datetime import datetime
from io import BytesIO
from typing import Optional, List, Dict

import pandas as pd
import uvicorn
import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session
from pydantic import BaseModel
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from fastapi.responses import StreamingResponse

# Configuration and Logging
load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.info("Initializing Performance Analyzer Backend...")

# Configure Gemini
# Assumes GEMINI_API_KEY is available in the environment
from dotenv import load_dotenv
load_dotenv()

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
if GEMINI_API_KEY and GEMINI_API_KEY != "YOUR_GEMINI_API_KEY_HERE":
    genai.configure(api_key=GEMINI_API_KEY)
else:
    GEMINI_API_KEY = ""
    logger.warning("GEMINI_API_KEY not found in environment variables.")

PREFERRED_GEMINI_MODELS = [
    "models/gemini-2.0-flash-lite",
    "models/gemini-2.0-flash",
    "models/gemini-2.5-flash",
    "models/gemini-2.5-flash-lite",
    "models/gemini-flash-latest",
]
_cached_gemini_model_name: Optional[str] = None


def get_gemini_model_name() -> str:
    global _cached_gemini_model_name

    if _cached_gemini_model_name:
        return _cached_gemini_model_name

    configured_name = os.environ.get("GEMINI_MODEL", "").strip()
    if configured_name:
        _cached_gemini_model_name = configured_name
        return _cached_gemini_model_name

    if not GEMINI_API_KEY:
        raise RuntimeError("Gemini API key is not configured.")

    try:
        available_models = {
            model.name
            for model in genai.list_models()
            if "generateContent" in getattr(model, "supported_generation_methods", [])
        }
        for model_name in PREFERRED_GEMINI_MODELS:
            if model_name in available_models:
                _cached_gemini_model_name = model_name
                logger.info("Using Gemini model: %s", _cached_gemini_model_name)
                return _cached_gemini_model_name
    except Exception as exc:
        logger.warning("Unable to list Gemini models, falling back to default: %s", exc)

    _cached_gemini_model_name = PREFERRED_GEMINI_MODELS[0]
    logger.info("Falling back to default Gemini model: %s", _cached_gemini_model_name)
    return _cached_gemini_model_name


def build_gemini_model():
    return genai.GenerativeModel(
        'gemini-2.5-flash',
        generation_config={"response_mime_type": "application/json"}
    )

# Admin credentials
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "superadmin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "superadmin123")

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

app = FastAPI(title="Performance Analyzer API")
logger.info("FastAPI Application Created.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database Setup
# Database Setup
SQLALCHEMY_DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./database.sqlite")

# connect_args={"check_same_thread": False} is only needed for SQLite
engine_kwargs = {}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(SQLALCHEMY_DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
class Base(DeclarativeBase):
    pass


class StudentPerformance(Base):
    """
    SQLAlchemy Model for storing student performance records from Excel uploads.
    """
    __tablename__ = "student_performance"
    id = Column(Integer, primary_key=True, index=True)
    rollNumber = Column(String, index=True)
    name = Column(String)
    totalMarks = Column(Float)
    subject = Column(String)
    year = Column(String)
    branch = Column(String)
    section = Column(String)
    uploadedBy = Column(String)
    uploadedAt = Column(DateTime, default=datetime.utcnow)
    
    # Advanced Analytics Fields
    normalized_score = Column(Float, nullable=True)
    assessment_score = Column(Float, nullable=True)
    final_combined_score = Column(Float, nullable=True)
    performance_category = Column(String, nullable=True)

class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    rollNumber = Column(String, unique=True, index=True)
    password = Column(String)
    section = Column(String, nullable=True)
    branch = Column(String, nullable=True)
    year = Column(String, nullable=True)

class PendingStudent(Base):
    __tablename__ = "pending_students"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    rollNumber = Column(String, unique=True, index=True)
    password = Column(String)
    section = Column(String, nullable=True)
    branch = Column(String, nullable=True)
    year = Column(String, nullable=True)
    status = Column(String, default="pending")

class Teacher(Base):
    __tablename__ = "teachers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    username = Column(String, unique=True, index=True)
    password = Column(String)
    role = Column(String, default="faculty")
    subject = Column(String)

class Branch(Base):
    __tablename__ = "branches"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    full_name = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class Section(Base):
    __tablename__ = "sections"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    branch = Column(String, nullable=True)
    year = Column(String, nullable=True)

class Test(Base):
    __tablename__ = "tests"
    id = Column(Integer, primary_key=True, index=True)
    testName = Column(String)
    subject = Column(String)
    year = Column(String)
    branch = Column(String)
    section = Column(String)
    numberOfQuestions = Column(Integer, default=20)
    startTime = Column(String) # Storing as ISO strings for simplicity
    endTime = Column(String)
    createdBy = Column(String)
    resultsReleasedAt = Column(DateTime, nullable=True)

class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, index=True)
    question = Column(Text)
    option_a = Column(String)
    option_b = Column(String)
    option_c = Column(String)
    option_d = Column(String)
    correct_answer = Column(String)

class StudentTestResult(Base):
    __tablename__ = "student_test_results"
    id = Column(Integer, primary_key=True, index=True)
    student_roll = Column(String, index=True)
    test_id = Column(Integer, index=True)
    score = Column(Integer)
    total_questions = Column(Integer)
    submitted_at = Column(DateTime, default=datetime.utcnow)

class StudentAnswer(Base):
    __tablename__ = "student_answers"
    id = Column(Integer, primary_key=True, index=True)
    student_roll = Column(String, index=True)
    test_id = Column(Integer, index=True)
    question_id = Column(Integer, index=True)
    selected_answer = Column(String)

class StudentAssignedQuestion(Base):
    __tablename__ = "student_assigned_questions"
    id = Column(Integer, primary_key=True, index=True)
    student_roll = Column(String, index=True)
    test_id = Column(Integer, index=True)
    question_id = Column(Integer, index=True)


class Job(Base):
    __tablename__ = "jobs"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(Text)
    company = Column(String)
    year = Column(String)
    branch = Column(String)
    section = Column(String)
    posted_by = Column(String)
    min_score = Column(Float, nullable=True) # Addition for F-11
    posted_at = Column(DateTime, default=datetime.utcnow)

class StudentAnalyticsProfile(Base):
    __tablename__ = "student_analytics_profile"
    id = Column(Integer, primary_key=True, index=True)
    student_roll = Column(String, unique=True, index=True)
    average_score = Column(Float)
    performance_level = Column(String)
    weak_subjects = Column(Text)
    reason = Column(Text)
    recommendations = Column(Text)
    trend = Column(String)
    predicted_score = Column(Float)
    risk_level = Column(String)
    last_updated = Column(DateTime, default=datetime.utcnow)

class StudentGoal(Base):
    __tablename__ = "student_goals"
    id = Column(Integer, primary_key=True, index=True)
    rollNumber = Column(String, index=True)
    subject = Column(String)
    targetScore = Column(Float)
    deadline = Column(String) # Storing as ISO string or date string
    status = Column(String, default="active") # active, achieved, missed

class SubjectResource(Base):
    __tablename__ = "subject_resources"
    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String, index=True)
    title = Column(String)
    url = Column(String)
    addedBy = Column(String)
    addedAt = Column(DateTime, default=datetime.utcnow)

class Announcement(Base):
    __tablename__ = "announcements"
    id = Column(Integer, primary_key=True, index=True)
    message = Column(Text)
    postedBy = Column(String)
    targetYear = Column(String) # "All", "1st", "2nd", etc
    targetBranch = Column(String) # "All", "CSE", etc
    timestamp = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    """F-18: Audit log for key system actions"""
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    actorUsername = Column(String, index=True)
    actorRole = Column(String)
    action = Column(String)        # e.g. "CREATE_TEST", "UPLOAD_MARKS", "DELETE_STUDENT"
    entityType = Column(String)    # e.g. "Test", "Student", "Job"
    entityId = Column(String)
    details = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)

class InsightCache(Base):
    """F-15: Cache AI-generated insights per student/entity"""
    __tablename__ = "insight_cache"
    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(String, index=True)   # rollNumber or faculty username
    entity_type = Column(String)              # "student" or "class"
    insight_text = Column(Text)
    data_hash = Column(String)
    generated_at = Column(DateTime, default=datetime.utcnow)

class ApplicationStageHistory(Base):
    """F-13: Job application status timeline"""
    __tablename__ = "application_stage_history"
    id = Column(Integer, primary_key=True, index=True)
    roll_number = Column(String, index=True)
    job_id = Column(Integer)
    company = Column(String)
    stage = Column(String)   # Applied, Shortlisted, Interview Scheduled, Offer Extended, Placed, Rejected
    updated_at = Column(DateTime, default=datetime.utcnow)
    updated_by = Column(String)

# Create tables
Base.metadata.create_all(bind=engine)

# Database Seeding
def seed_default_accounts():
    db = SessionLocal()
    try:
        # Check if TPO exists
        tpo_user = db.query(Teacher).filter(Teacher.username == "TPO").first()
        if not tpo_user:
            new_tpo = Teacher(
                name="Training & Placement Officer",
                username="TPO",
                password="TPO", # Hardcoded default as requested
                role="tpo",
                subject="Placement Training" # Dummy subject
            )
            db.add(new_tpo)
            db.commit()
    except Exception as e:
        print(f"Error seeding background info: {e}")
    finally:
        db.close()

seed_default_accounts()

# Pydantic Request Models
class BranchCreateRequest(BaseModel):
    name: str
    full_name: str

class StudentRegisterRequest(BaseModel):
    name: str
    rollNumber: str
    password: str
    section: Optional[str] = None
    branch: Optional[str] = None
    year: Optional[str] = None

class StudentLoginRequest(BaseModel):
    rollNumber: str
    password: str

class TeacherCreateRequest(BaseModel):
    name: str
    username: str
    password: str
    role: str
    subject: str

class TeacherLoginRequest(BaseModel):
    username: str
    password: str

class SectionCreateRequest(BaseModel):
    name: str
    branch: Optional[str] = None
    year: Optional[str] = None

class JobCreateRequest(BaseModel):
    title: str
    description: str
    company: str
    year: str
    branch: str
    section: str
    posted_by: str
    min_score: Optional[float] = None

class TestCreateRequest(BaseModel):
    testName: str
    subject: str
    year: str
    branch: str
    section: str
    numberOfQuestions: int
    startTime: str
    endTime: str
    createdBy: str
    questions: Optional[List[Dict]] = None # Questions if uploading via JSON manually

class AdminLoginRequest(BaseModel):
    username: str
    password: str

class StudentGoalCreateRequest(BaseModel):
    subject: str
    targetScore: float
    deadline: str

class StudentGoalUpdateRequest(BaseModel):
    status: str

class SubjectResourceCreateRequest(BaseModel):
    subject: str
    title: str
    url: str
    addedBy: str

class AnnouncementCreateRequest(BaseModel):
    message: str
    postedBy: str
    targetYear: str = "All"
    targetBranch: str = "All"

class StudentTestSubmission(BaseModel):
    student_roll: str
    answers: dict[str, str] # mapping of question_id (stringified int) to selected_answer

class VariationRequest(BaseModel):
    base_questions: list
    multiplication_factor: int
    total_count: int
    subject: str

class UpdateStudentPasswordRequest(BaseModel):
    newPassword: str

@app.put("/api/admin/students/{roll_number}/password")
async def update_student_password(roll_number: str, request: UpdateStudentPasswordRequest):
    """Allows admin to reset a student's password."""
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.rollNumber == roll_number).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        student.password = hash_password(request.newPassword)
        db.commit()
        return {"message": "Student password updated successfully"}
    finally:
        db.close()

@app.post("/api/admin/login")
async def login_admin(request: AdminLoginRequest):
    """Validates super admin credentials from environment variables."""
    if request.username == ADMIN_USERNAME and request.password == ADMIN_PASSWORD:
        return {
            "message": "Admin login successful",
            "admin": {"role": "admin", "username": request.username}
        }
    raise HTTPException(status_code=401, detail="Invalid admin credentials")

@app.post("/api/students/register")
async def register_student(request: StudentRegisterRequest):
    db = SessionLocal()
    try:
        # Check if already a student
        if db.query(Student).filter(Student.rollNumber == request.rollNumber).first():
            raise HTTPException(status_code=400, detail="Student already exists")
        
        # Check if already pending
        if db.query(PendingStudent).filter(PendingStudent.rollNumber == request.rollNumber).first():
            raise HTTPException(status_code=400, detail="Registration already pending approval")
        
        new_pending_student = PendingStudent(
            name=request.name,
            rollNumber=request.rollNumber,
            password=hash_password(request.password), # Store hashed so it's ready upon approval
            section=request.section,
            branch=request.branch,
            year=request.year
        )
        db.add(new_pending_student)
        db.commit()
        return {"message": "Registration submitted for admin approval"}
    finally:
        db.close()

@app.post("/api/admin/students")
async def admin_add_student(request: StudentRegisterRequest):
    """Directly adds a student without pending approval."""
    db = SessionLocal()
    try:
        # Check if already a student
        if db.query(Student).filter(Student.rollNumber == request.rollNumber).first():
            raise HTTPException(status_code=400, detail="Student already exists")
        
        # Remove from pending if they happen to be there
        pending = db.query(PendingStudent).filter(PendingStudent.rollNumber == request.rollNumber).first()
        if pending:
            db.delete(pending)
            
        new_student = Student(
            name=request.name,
            rollNumber=request.rollNumber,
            password=hash_password(request.password),
            section=request.section,
            branch=request.branch,
            year=request.year
        )
        db.add(new_student)
        db.commit()
        return {"message": "Student added successfully"}
    finally:
        db.close()

# ─────────────────────────────────────────────
# F-XX: Admin Student Approval Workflow
# ─────────────────────────────────────────────
@app.get("/api/admin/pending-students")
async def get_pending_students():
    db: Session = SessionLocal()
    try:
        pending = db.query(PendingStudent).all()
        return [{"rollNumber": p.rollNumber, "name": p.name, "year": p.year, "branch": p.branch, "section": p.section, "status": p.status} for p in pending]
    finally:
        db.close()

class BulkRollNumbersRequest(BaseModel):
    rollNumbers: list[str]

@app.post("/api/admin/pending-students/bulk-approve")
async def bulk_approve_students(request: BulkRollNumbersRequest):
    db: Session = SessionLocal()
    try:
        pending_students = db.query(PendingStudent).filter(PendingStudent.rollNumber.in_(request.rollNumbers)).all()
        
        approved_count = 0
        for p in pending_students:
            # Verify they haven't been added manually in the meantime
            if not db.query(Student).filter(Student.rollNumber == p.rollNumber).first():
                new_student = Student(
                    name=p.name,
                    rollNumber=p.rollNumber,
                    password=p.password, # Already hashed during registration
                    section=p.section,
                    branch=p.branch,
                    year=p.year
                )
                db.add(new_student)
                approved_count += 1
            db.delete(p) # Remove from pending
            
        db.commit()
        return {"message": f"Successfully approved {approved_count} students"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.post("/api/admin/pending-students/bulk-reject")
async def bulk_reject_students(request: BulkRollNumbersRequest):
    db: Session = SessionLocal()
    try:
        count = db.query(PendingStudent).filter(PendingStudent.rollNumber.in_(request.rollNumbers)).delete(synchronize_session=False)
        db.commit()
        return {"message": f"Successfully rejected {count} registrations"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.post("/api/students/{roll_number}/goals")
async def create_student_goal(roll_number: str, request: StudentGoalCreateRequest):
    db: Session = SessionLocal()
    try:
        new_goal = StudentGoal(
            rollNumber=roll_number,
            subject=request.subject,
            targetScore=request.targetScore,
            deadline=request.deadline
        )
        db.add(new_goal)
        db.commit()
        db.refresh(new_goal)
        return {"message": "Goal created successfully", "goal": {"id": new_goal.id, "subject": new_goal.subject, "targetScore": new_goal.targetScore, "deadline": new_goal.deadline, "status": new_goal.status}}
    finally:
        db.close()

@app.get("/api/students/{roll_number}/goals")
async def get_student_goals(roll_number: str):
    db: Session = SessionLocal()
    try:
        goals = db.query(StudentGoal).filter(StudentGoal.rollNumber == roll_number).all()
        return [
            {
                "id": g.id,
                "subject": g.subject,
                "targetScore": g.targetScore,
                "deadline": g.deadline,
                "status": g.status
            } for g in goals
        ]
    finally:
        db.close()

@app.put("/api/students/goals/{goal_id}/status")
async def update_student_goal_status(goal_id: int, request: StudentGoalUpdateRequest):
    db: Session = SessionLocal()
    try:
        goal = db.query(StudentGoal).filter(StudentGoal.id == goal_id).first()
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        
        goal.status = request.status
        db.commit()
        return {"message": "Goal status updated successfully"}
    finally:
        db.close()

@app.get("/api/students/{roll_number}/test-history")
async def get_test_history(roll_number: str):
    db: Session = SessionLocal()
    try:
        results = db.query(StudentTestResult).filter(StudentTestResult.student_roll == roll_number).all()
        history = []
        for r in results:
            test = db.query(Test).filter(Test.id == r.test_id).first()
            if test and test.resultsReleasedAt:
                history.append({
                    "id": r.id,
                    "test_id": r.test_id,
                    "testName": test.testName,
                    "subject": test.subject,
                    "score": r.score,
                    "total_questions": r.total_questions,
                    "percentage": (r.score / r.total_questions * 100) if r.total_questions > 0 else 0,
                    "submitted_at": r.submitted_at.isoformat() if r.submitted_at else None
                })
        # Sort by submitted_at descending
        history.sort(key=lambda x: x["submitted_at"] or "", reverse=True)
        return history
    finally:
        db.close()

@app.put("/api/tests/{test_id}/release")
async def release_test_results(test_id: int):
    db: Session = SessionLocal()
    try:
        test = db.query(Test).filter(Test.id == test_id).first()
        if not test:
            raise HTTPException(status_code=404, detail="Test not found")
        test.resultsReleasedAt = datetime.utcnow()
        db.commit()
        return {"message": "Test results released successfully"}
    finally:
        db.close()


@app.delete("/api/tests/{test_id}")
async def delete_test(test_id: int, username: str):
    db: Session = SessionLocal()
    try:
        test = db.query(Test).filter(Test.id == test_id).first()
        if not test:
            raise HTTPException(status_code=404, detail="Test not found")

        if test.createdBy != username:
            raise HTTPException(status_code=403, detail="You can only delete tests you created")

        db.query(StudentAssignedQuestion).filter(StudentAssignedQuestion.test_id == test_id).delete()
        db.query(StudentAnswer).filter(StudentAnswer.test_id == test_id).delete()
        db.query(StudentTestResult).filter(StudentTestResult.test_id == test_id).delete()
        db.query(Question).filter(Question.test_id == test_id).delete()
        db.delete(test)

        audit_log = AuditLog(
            actorUsername=username,
            actorRole="faculty",
            action="DELETE_TEST",
            entityType="Test",
            entityId=str(test_id),
            details=f"Deleted test '{test.testName}' and related question/result records"
        )
        db.add(audit_log)
        db.commit()
        return {"message": "Test deleted successfully"}
    finally:
        db.close()

@app.get("/api/resources/{subject}")
async def get_subject_resources(subject: str):
    db: Session = SessionLocal()
    try:
        resources = db.query(SubjectResource).filter(
            SubjectResource.subject.ilike(f"%{subject}%")
        ).all()
        return [
            {
                "id": r.id,
                "subject": r.subject,
                "title": r.title,
                "url": r.url,
                "addedBy": r.addedBy,
                "addedAt": r.addedAt.isoformat() if r.addedAt else None
            } for r in resources
        ]
    finally:
        db.close()

@app.post("/api/resources")
async def add_subject_resource(request: SubjectResourceCreateRequest):
    db: Session = SessionLocal()
    try:
        new_resource = SubjectResource(
            subject=request.subject,
            title=request.title,
            url=request.url,
            addedBy=request.addedBy
        )
        db.add(new_resource)
        db.commit()
        db.refresh(new_resource)
        return {
            "id": new_resource.id,
            "subject": new_resource.subject,
            "title": new_resource.title,
            "url": new_resource.url
        }
    finally:
        db.close()

@app.post("/api/announcements")
async def create_announcement(request: AnnouncementCreateRequest):
    db: Session = SessionLocal()
    try:
        ann = Announcement(
            message=request.message,
            postedBy=request.postedBy,
            targetYear=request.targetYear,
            targetBranch=request.targetBranch
        )
        db.add(ann)
        db.commit()
        db.refresh(ann)
        return {"message": "Announcement created"}
    finally:
        db.close()

@app.get("/api/announcements")
async def get_announcements(year: str = "All", branch: str = "All"):
    db: Session = SessionLocal()
    try:
        # Get all announcements that match the current student's year and branch, or "All"
        announcements = db.query(Announcement).filter(
            (Announcement.targetYear == "All") | (Announcement.targetYear == year),
            (Announcement.targetBranch == "All") | (Announcement.targetBranch == branch)
        ).order_by(Announcement.timestamp.desc()).all()
        return [
            {
                "id": a.id,
                "message": a.message,
                "postedBy": a.postedBy,
                "targetYear": a.targetYear,
                "targetBranch": a.targetBranch,
                "timestamp": a.timestamp.isoformat() if a.timestamp else None
            } for a in announcements
        ]
    finally:
        db.close()

@app.get("/api/jobs/{job_id}/eligible-students")
async def get_eligible_students_for_job(job_id: int):
    """F-11: Return students eligible for this job based on branch, year, section and score"""
    db: Session = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
            
        students_query = db.query(Student)
        if job.year and job.year != "All":
            # Just simple check
            students_query = students_query.filter(Student.year == job.year)
        if job.branch and job.branch != "All":
            students_query = students_query.filter(Student.branch == job.branch)
        if job.section and job.section != "All":
            students_query = students_query.filter(Student.section == job.section)
            
        students = students_query.all()
        
        eligible_students = []
        for s in students:
            # Check score if job has a criteria
            if job.min_score:
                profile = db.query(StudentAnalyticsProfile).filter(StudentAnalyticsProfile.student_roll == s.rollNumber).first()
                if not profile or profile.average_score is None or profile.average_score < job.min_score:
                    continue # Not eligible
            eligible_students.append({
                "rollNumber": s.rollNumber,
                "name": s.name,
                "section": s.section
            })
            
        return eligible_students
    finally:
        db.close()

@app.get("/api/students/leaderboard")
async def get_leaderboard():
    """F-06: Return top 10 students by average score"""
    db: Session = SessionLocal()
    try:
        # Get profiles with average_score descending
        profiles = db.query(StudentAnalyticsProfile).filter(StudentAnalyticsProfile.average_score != None).order_by(StudentAnalyticsProfile.average_score.desc()).limit(10).all()
        
        leaderboard = []
        for p in profiles:
            student = db.query(Student).filter(Student.rollNumber == p.student_roll).first()
            if student:
                leaderboard.append({
                    "rollNumber": student.rollNumber,
                    "name": student.name,
                    "branch": student.branch,
                    "section": student.section,
                    "average_score": round(p.average_score, 1),
                    "tests_taken": p.total_tests_taken
                })
        return leaderboard
    finally:
        db.close()

@app.get("/api/students/{roll_number}/report/pdf")
async def generate_student_report_pdf(roll_number: str):
    """F-03: Generate and download a PDF performance report"""
    db: Session = SessionLocal()
    try:
        student = db.query(Student).filter(Student.rollNumber == roll_number).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        profile = db.query(StudentAnalyticsProfile).filter(StudentAnalyticsProfile.student_roll == roll_number).first()
        test_results = db.query(StudentTestResult).filter(StudentTestResult.student_roll == roll_number).order_by(StudentTestResult.submitted_at.desc()).limit(10).all()
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        elements = []

        # Title
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontSize=24,
            alignment=1, # Center
            spaceAfter=20,
            textColor=colors.HexColor("#3b82f6") # Primary color
        )
        elements.append(Paragraph(f"Academic Performance Report", title_style))
        elements.append(Spacer(1, 12))

        # Student Info Table
        info_data = [
            ["Name:", student.name, "Roll Number:", student.rollNumber],
            ["Branch:", student.branch, "Section:", student.section],
            ["Year:", student.year, "Report Date:", datetime.now().strftime("%Y-%m-%d")]
        ]
        info_table = Table(info_data, colWidths=[80, 150, 80, 150])
        info_table.setStyle(TableStyle([
            ('FONTNAME', (0,0), (-1,-1), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 10),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('TEXTCOLOR', (0,0), (0, -1), colors.grey),
            ('TEXTCOLOR', (2,0), (2, -1), colors.grey),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 20))

        # Overview Stats
        if profile:
            elements.append(Paragraph("Overall Performance Summary", styles['Heading2']))
            stats_data = [
                ["Metric", "Value"],
                ["Average Score:", f"{round(profile.average_score, 2)}%" if profile.average_score else "N/A"],
                ["Total Tests Taken:", str(profile.total_tests_taken)],
                ["Performance Category:", profile.performance_category or "N/A"]
            ]
            stats_table = Table(stats_data, colWidths=[200, 100])
            stats_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#eff6ff")),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#1e40af")),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('PADDING', (0, 0), (-1, -1), 6),
            ]))
            elements.append(stats_table)
            elements.append(Spacer(1, 20))

            # Subject-wise Breakdown
            if profile.marks_summary:
                elements.append(Paragraph("Subject-wise Performance", styles['Heading2']))
                subject_data = [["Subject", "Average Score (%)"]]
                for sub, score in profile.marks_summary.items():
                    subject_data.append([sub, f"{score}%"])
                
                sub_table = Table(subject_data, colWidths=[250, 100])
                sub_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#eff6ff")),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#1e40af")),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                    ('ALIGN', (1, 1), (1, -1), 'RIGHT'),
                    ('PADDING', (0, 0), (-1, -1), 6),
                ]))
                elements.append(sub_table)
                elements.append(Spacer(1, 20))

        # Recent Test Attempts
        if test_results:
            elements.append(Paragraph("Recent Test Results", styles['Heading2']))
            test_data = [["Test Name", "Subject", "Score", "Percentage", "Date"]]
            for res in test_results:
                test = db.query(Test).filter(Test.id == res.test_id).first()
                test_name = test.testName if test else "Unknown Test"
                subject = test.subject if test else "N/A"
                date_str = res.submitted_at.strftime("%Y-%m-%d") if res.submitted_at else "N/A"
                test_data.append([test_name, subject, f"{res.score}/{res.total_marks}", f"{res.percentage}%", date_str])
            
            test_table = Table(test_data, colWidths=[130, 100, 70, 80, 80])
            test_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#eff6ff")),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#1e40af")),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('PADDING', (0, 0), (-1, -1), 6),
            ]))
            elements.append(test_table)

        # Footer
        elements.append(Spacer(1, 40))
        footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, alignment=1, textColor=colors.grey)
        elements.append(Paragraph(f"Generated by Performance Analyzer System • {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", footer_style))

        doc.build(elements)
        buffer.seek(0)
        
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=Performance_Report_{roll_number}.pdf"}
        )
    finally:
        db.close()

@app.post("/api/students/login")
async def login_student(request: StudentLoginRequest):
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.rollNumber == request.rollNumber).first()
        if not student:
            raise HTTPException(status_code=401, detail="Invalid roll number or password")
        
        if student.password != hash_password(request.password):
            # Allow fallback to plain text if the user existed from before hashing was implemented
            if student.password != request.password:
                raise HTTPException(status_code=401, detail="Invalid roll number or password")
            else:
                # Optional: Upgrade password to hash here automatically
                student.password = hash_password(request.password)
                db.commit()

        return {
            "message": "Login successful",
            "student": {
                "name": student.name,
                "rollNumber": student.rollNumber,
                "section": student.section,
                "branch": student.branch,
                "year": student.year
            }
        }
    finally:
        db.close()

@app.post("/api/teachers/add")
async def add_teacher(teacher: TeacherCreateRequest):
    db: Session = SessionLocal()
    try:
        # Check if username already exists
        existing = db.query(Teacher).filter(Teacher.username == teacher.username).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already exists")

        new_teacher = Teacher(
            name=teacher.name,
            username=teacher.username,
            password=hash_password(teacher.password),
            role=teacher.role,
            subject=teacher.subject
        )
        db.add(new_teacher)
        db.commit()
        db.refresh(new_teacher)
        return {"message": "Teacher added successfully", "teacher": {"id": new_teacher.id, "name": new_teacher.name, "username": new_teacher.username, "role": new_teacher.role, "subject": new_teacher.subject}}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.put("/api/teachers/{teacher_id}")
async def update_teacher(teacher_id: int, teacher: TeacherCreateRequest):
    db: Session = SessionLocal()
    try:
        existing = db.query(Teacher).filter(Teacher.id == teacher_id).first()
        if not existing:
            raise HTTPException(status_code=404, detail="Teacher not found")

        existing.name = teacher.name
        existing.username = teacher.username
        # Only update password if provided as something other than the placeholder
        if teacher.password and len(teacher.password) > 0 and teacher.password != "••••••••":
            existing.password = hash_password(teacher.password)
        existing.role = teacher.role
        existing.subject = teacher.subject
        
        db.commit()
        return {"message": "Teacher updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()
@app.delete("/api/teachers/cleanup")
async def bulk_cleanup_teachers():
    """F-20: Bulk delete all faculty and TPO records"""
    db: Session = SessionLocal()
    try:
        count = db.query(Teacher).delete()
        db.commit()
        return {"message": f"Successfully removed {count} faculty records."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.delete("/api/teachers/{teacher_id}")
async def delete_teacher(teacher_id: int):
    db: Session = SessionLocal()
    try:
        teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
        if not teacher:
            raise HTTPException(status_code=404, detail="Teacher not found")
        db.delete(teacher)
        db.commit()
        return {"message": "Teacher deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.post("/api/teachers/login")
async def login_teacher(login_req: TeacherLoginRequest):
    db: Session = SessionLocal()
    try:
        clean_username = login_req.username.strip()
        clean_password = login_req.password.strip()
        
        teacher = db.query(Teacher).filter(Teacher.username == clean_username).first()
        if not teacher:
            raise HTTPException(status_code=401, detail="Invalid username or password")
            
        if teacher.password != hash_password(clean_password):
            # Allow fallback for previously unhashed admin/faculty
            if teacher.password != clean_password:
                raise HTTPException(status_code=401, detail="Invalid username or password")
            else:
                teacher.password = hash_password(clean_password)
                db.commit()
            
        return {
            "message": "Login successful",
            "teacher": {
                "id": teacher.id,
                "name": teacher.name,
                "username": teacher.username,
                "role": teacher.role,
                "subject": teacher.subject
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")
    finally:
        db.close()

@app.get("/api/teachers")
async def get_teachers():
    db = SessionLocal()
    try:
        teachers = db.query(Teacher).all()
        return [
            {
                "id": t.id,
                "name": t.name,
                "username": t.username,
                "role": t.role,
                "subject": t.subject
            } for t in teachers
        ]
    finally:
        db.close()

@app.post("/api/sections/add")
async def add_section(request: SectionCreateRequest):
    db = SessionLocal()
    try:
        if db.query(Section).filter(Section.name == request.name).first():
            raise HTTPException(status_code=400, detail="Section already exists")
        
        new_section = Section(
            name=request.name,
            branch=request.branch,
            year=request.year
        )
        db.add(new_section)
        db.commit()
        return {"message": "Section added successfully", "section": request.model_dump()}
    finally:
        db.close()

@app.post("/api/branches")
async def add_branch(request: BranchCreateRequest):
    db: Session = SessionLocal()
    try:
        if db.query(Branch).filter(Branch.name == request.name.upper()).first():
            raise HTTPException(status_code=400, detail="Branch already exists")
        
        new_branch = Branch(
            name=request.name.upper(),
            full_name=request.full_name
        )
        db.add(new_branch)
        db.commit()
        return {"message": "Branch created successfully", "name": new_branch.name, "full_name": new_branch.full_name}
    finally:
        db.close()

@app.get("/api/branches")
async def get_branches():
    db: Session = SessionLocal()
    try:
        branches = db.query(Branch).all()
        if not branches:
            default_branches = [
                {"name": "CSE", "full_name": "Computer Science and Engineering"},
                {"name": "IT", "full_name": "Information Technology"},
                {"name": "ECE", "full_name": "Electronics and Communication Engineering"},
                {"name": "EEE", "full_name": "Electrical and Electronics Engineering"},
                {"name": "MECH", "full_name": "Mechanical Engineering"},
                {"name": "CIVIL", "full_name": "Civil Engineering"}
            ]
            for br in default_branches:
                db.add(Branch(name=br["name"], full_name=br["full_name"]))
            db.commit()
            branches = db.query(Branch).all()
        return [{"id": b.id, "name": b.name, "full_name": b.full_name} for b in branches]
    finally:
        db.close()

@app.delete("/api/branches/{branch_id}")
async def delete_branch(branch_id: int):
    db: Session = SessionLocal()
    try:
        branch = db.query(Branch).filter(Branch.id == branch_id).first()
        if not branch:
            raise HTTPException(status_code=404, detail="Branch not found")
        
        # Check if students exist for this branch
        students_count = db.query(Student).filter(Student.branch == branch.name).count()
        if students_count > 0:
            raise HTTPException(status_code=400, detail=f"Cannot delete branch. {students_count} students are linked to it.")
            
        db.delete(branch)
        db.commit()
        return {"message": "Branch deleted successfully"}
    finally:
        db.close()

@app.get("/api/sections")
async def get_sections():
    """List sections from the sections table AND unique sections found in students table"""
    db = SessionLocal()
    try:
        # 1. From the explicit 'sections' table
        defined_sections = db.query(Section).all()
        results = [{"id": s.id, "name": s.name, "branch": s.branch, "year": s.year} for s in defined_sections]
        
        # 2. Extract unique sections from the Student table
        student_sections = db.query(Student.section).distinct().all()
        student_section_names = [s[0] for s in student_sections if s[0]]
        
        # Merge them (avoid duplicates)
        existing_names = {s["name"].upper() for s in results}
        for name in student_section_names:
            if name.upper() not in existing_names:
                results.append({"id": None, "name": name, "branch": "Auto-discovered", "year": "Mixed"})
                existing_names.add(name.upper())

        return results
    finally:
        db.close()

# ⚠️ BILLING WARNING: This endpoint calls the Google Gemini API which may incur costs.
# Ensure GEMINI_API_KEY is set and monitor usage in your Google Cloud Console.
@app.post("/api/tests/create")
async def create_test(request: TestCreateRequest):
    db: Session = SessionLocal()
    try:
        new_test = Test(
            testName=request.testName,
            subject=request.subject,
            year=request.year,
            branch=request.branch,
            section=request.section,
            numberOfQuestions=request.numberOfQuestions,
            startTime=request.startTime,
            endTime=request.endTime,
            createdBy=request.createdBy
        )
        db.add(new_test)
        db.commit()
        db.refresh(new_test)

        # Skip AI if questions are provided in the request
        if request.questions and len(request.questions) > 0:
            logger.info(f"Using manual JSON questions for test: {request.testName}")
            for q_data in request.questions:
                q_model = Question(
                    test_id=new_test.id,
                    question=q_data.get("question", q_data.get("question_text", "Unknown Question")),
                    option_a=q_data.get("option_a", ""),
                    option_b=q_data.get("option_b", ""),
                    option_c=q_data.get("option_c", ""),
                    option_d=q_data.get("option_d", ""),
                    correct_answer=q_data.get("correct_answer", "")
                )
                db.add(q_model)
            db.commit()
            return {"message": "Test and questions created successfully from JSON", "test": request.model_dump(), "test_id": new_test.id}

        # Otherwise, call Gemini to generate questions in a SINGLE request (Replica Match)
        try:
            if not GEMINI_API_KEY:
                raise HTTPException(
                    status_code=500,
                    detail="Gemini API key is not configured. Switch to JSON Import or set a valid GEMINI_API_KEY."
                )

            model = build_gemini_model()
            
            prompt = f"""
            Generate exactly {request.numberOfQuestions} multiple choice questions for the subject "{request.subject}".
            Return a JSON array of objects.
            Each object must use these exact keys:
            "question", "option_a", "option_b", "option_c", "option_d", "correct_answer".
            Make sure "correct_answer" exactly matches the text of one of the options (A, B, C, or D).
            """
            
            response = model.generate_content(prompt)
            questions_data = json.loads(response.text)

            for q_data in questions_data:
                q_model = Question(
                    test_id=new_test.id,
                    question=q_data.get("question", "Unknown Question"),
                    option_a=q_data.get("option_a", ""),
                    option_b=q_data.get("option_b", ""),
                    option_c=q_data.get("option_c", ""),
                    option_d=q_data.get("option_d", ""),
                    correct_answer=q_data.get("correct_answer", "")
                )
                db.add(q_model)
            
            db.commit()

        except Exception as e:
            logger.error(f"Error generating questions via Gemini: {e}")
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to generate questions: {str(e)}")

        return {"message": "Test and questions created successfully", "test": request.model_dump(exclude={'questions'}), "test_id": new_test.id}
    finally:
        db.close()

@app.get("/api/tests/student")
async def get_student_tests(year: str, branch: str, section: str, student_roll: str):
    db: Session = SessionLocal()
    try:
        from datetime import datetime
        
        # 1. Fetch tests the student has already taken
        taken_tests = db.query(StudentTestResult.test_id).filter(
            StudentTestResult.student_roll == student_roll
        ).all()
        taken_test_ids = [t[0] for t in taken_tests]

        # Handle year string mismatches (e.g. "4th Year" vs "Fourth Year")
        year_aliases = [year]
        year_lower = year.lower()
        if "1st" in year_lower or "first" in year_lower or year == "1": year_aliases = ["1st Year", "First Year", "1"]
        elif "2nd" in year_lower or "second" in year_lower or year == "2": year_aliases = ["2nd Year", "Second Year", "2"]
        elif "3rd" in year_lower or "third" in year_lower or year == "3": year_aliases = ["3rd Year", "Third Year", "3"]
        elif "4th" in year_lower or "fourth" in year_lower or year == "4": year_aliases = ["4th Year", "Fourth Year", "4"]

        # 2. Fetch active assigned tests mapping to the student demographic
        all_assigned_tests = db.query(Test).filter(
            Test.year.in_(year_aliases),
            Test.branch == branch,
            Test.section == section
        ).all()

        current_time = datetime.now()
        available_tests = []

        # 3. Filter out taken tests, and tests where the endTime is strictly in the past
        for t in all_assigned_tests:
            if t.id in taken_test_ids:
                continue
                
            try:
                # The frontend passes startTime and endTime as ISO dates or 'HH:MM' (which gets appended to date in the frontend state). Let's parse securely.
                # Assuming t.endTime is an ISO string: "2026-03-06T15:30"
                if t.endTime:
                    end_dt = datetime.fromisoformat(t.endTime)
                    if current_time > end_dt:
                        continue # Time has expired
            except Exception as e:
                logger.warning(f"Could not parse test end time for {t.id}: {t.endTime} - {e}")
                
            available_tests.append(t)
        
        return [
            {
                "id": str(t.id),
                "testName": t.testName,
                "subject": t.subject,
                "year": t.year,
                "branch": t.branch,
                "section": t.section,
                "startTime": t.startTime,
                "endTime": t.endTime,
                "createdBy": t.createdBy
            } for t in available_tests
        ]
    finally:
        db.close()

@app.get("/api/tests/faculty")
async def get_faculty_tests(username: str):
    db: Session = SessionLocal()
    try:
        tests = db.query(Test).filter(Test.createdBy == username).all()
        return [
            {
                "id": str(t.id),
                "testName": t.testName,
                "subject": t.subject,
                "year": t.year,
                "branch": t.branch,
                "section": t.section,
                "startTime": t.startTime,
                "endTime": t.endTime,
                "createdBy": t.createdBy
            } for t in tests
        ]
    finally:
        db.close()

@app.get("/api/tests/{test_id}/questions")
async def get_test_questions(test_id: int, student_roll: str):
    """
    Fetches the questions for a specific test for the student to take.
    OMITS the correct_answer field for security.
    """
    db: Session = SessionLocal()
    try:
        test = db.query(Test).filter(Test.id == test_id).first()
        if not test:
            raise HTTPException(status_code=404, detail="Test not found")

        # Check if the student already has assigned questions for this test
        assigned_questions = db.query(StudentAssignedQuestion).filter(
            StudentAssignedQuestion.student_roll == student_roll,
            StudentAssignedQuestion.test_id == test_id
        ).all()

        import random

        if assigned_questions:
            # Fetch those specific questions
            question_ids = [aq.question_id for aq in assigned_questions]
            selected_questions_unordered = db.query(Question).filter(Question.id.in_(question_ids)).all()
            
            # Sort them in the order they were assigned to maintain order per student
            q_map = {q.id: q for q in selected_questions_unordered}
            selected_questions = [q_map[q_id] for q_id in question_ids if q_id in q_map]
        else:
            # First time: select random questions and assign them
            all_questions = db.query(Question).filter(Question.test_id == test_id).all()
            
            # Select required number (or all if not enough)
            num_req = test.numberOfQuestions if test.numberOfQuestions else len(all_questions)
            if num_req > len(all_questions):
                num_req = len(all_questions)
                
            selected_questions = random.sample(all_questions, num_req) if num_req < len(all_questions) else all_questions
            # Randomize order even if we pick all
            random.shuffle(selected_questions)

            # Save the assignment
            for q in selected_questions:
                assignment = StudentAssignedQuestion(
                    student_roll=student_roll,
                    test_id=test_id,
                    question_id=q.id
                )
                db.add(assignment)
            db.commit()

        result = []
        for q in selected_questions:
            # Shuffle options
            options = [
                {"key": "a", "text": q.option_a},
                {"key": "b", "text": q.option_b},
                {"key": "c", "text": q.option_c},
                {"key": "d", "text": q.option_d}
            ]
            random.shuffle(options)
            
            result.append({
                "id": str(q.id),
                "question": q.question,
                "option_a": options[0]["text"],
                "option_b": options[1]["text"],
                "option_c": options[2]["text"],
                "option_d": options[3]["text"]
            })

        return result
    finally:
        db.close()

class SubmitTestRequest(BaseModel):
    student_roll: str
    answers: dict

@app.post("/api/tests/{test_id}/submit")
async def submit_test(test_id: int, request: SubmitTestRequest):
    """
    Evaluates a submitted test against the database question keys.
    """
    db: Session = SessionLocal()
    try:
        all_questions = db.query(Question).filter(Question.test_id == test_id).all()
        if not all_questions:
            raise HTTPException(status_code=404, detail="Test not found or has no questions.")

        score = 0
        total_questions = len(all_questions)

        # Build mapping of question_id -> correct_answer
        answer_key = {str(q.id): q.correct_answer for q in all_questions}

        # Check submitted answers and score them while saving the student_answers row
        for q_id_str, selected_ans in request.answers.items():
            is_correct = False
            correct_ans = answer_key.get(q_id_str)
            if correct_ans and selected_ans == correct_ans:
                score += 1
                is_correct = True
            
            # Save individual answer for metrics optional
            student_answer = StudentAnswer(
                student_roll=request.student_roll,
                test_id=test_id,
                question_id=int(q_id_str),
                selected_answer=selected_ans
            )
            db.add(student_answer)

        # Save test result
        test_result = StudentTestResult(
            student_roll=request.student_roll,
            test_id=test_id,
            score=score,
            total_questions=total_questions
        )
        db.add(test_result)
        db.commit()

        return {
            "message": "Test submitted successfully",
            "score": score,
            "total_questions": total_questions
        }
    finally:
        db.close()

@app.get("/api/tests/{test_id}/questions/all")
async def get_all_test_questions(test_id: int):
    """
    Fetches the questions for a specific test INCLUDING the correct_answer for faculty/admin.
    Returns all generated questions.
    """
    db: Session = SessionLocal()
    try:
        test = db.query(Test).filter(Test.id == test_id).first()
        if not test:
            raise HTTPException(status_code=404, detail="Test not found")

        all_questions = db.query(Question).filter(Question.test_id == test_id).all()
        
        return [
            {
                "id": str(q.id),
                "question": q.question,
                "option_a": q.option_a,
                "option_b": q.option_b,
                "option_c": q.option_c,
                "option_d": q.option_d,
                "correct_answer": q.correct_answer
            } for q in all_questions
        ]
    finally:
        db.close()

@app.post("/api/sections/add")
async def add_section(request: SectionCreateRequest):
    db = SessionLocal()
    try:
        if db.query(Section).filter(Section.name == request.name).first():
            raise HTTPException(status_code=400, detail="Section already exists")
        
        new_section = Section(
            name=request.name,
            branch=request.branch,
            year=request.year
        )
        db.add(new_section)
        db.commit()
        return {"message": "Section added successfully", "section": request.model_dump()}
    finally:
        db.close()

@app.post("/api/jobs/create")
async def create_job(request: JobCreateRequest):
    db: Session = SessionLocal()
    try:
        new_job = Job(
            title=request.title,
            description=request.description,
            company=request.company,
            year=request.year,
            branch=request.branch,
            section=request.section,
            posted_by=request.posted_by,
            min_score=request.min_score
        )
        db.add(new_job)
        db.commit()
        db.refresh(new_job)
        return {"message": "Job created successfully", "job_id": new_job.id}
    finally:
        db.close()

@app.get("/api/jobs")
async def get_jobs():
    db: Session = SessionLocal()
    try:
        jobs = db.query(Job).all()
        return [
            {
                "id": j.id,
                "title": j.title,
                "description": j.description,
                "company": j.company,
                "year": j.year,
                "branch": j.branch,
                "section": j.section,
                "posted_by": j.posted_by,
                "min_score": j.min_score,
                "posted_at": j.posted_at.isoformat() if j.posted_at else None
            } for j in jobs
        ]
    finally:
        db.close()

@app.get("/api/students/{roll_number}/analytics")
async def get_student_analytics(roll_number: str):
    """
    Fetches combined analytics data for a specific student, merging uploaded internal
    marks with dynamically scored AI-generated tests.
    """
    db: Session = SessionLocal()
    try:
        # Fetch uploaded performance (internal marks)
        internal_performances = db.query(StudentPerformance).filter(StudentPerformance.rollNumber == roll_number).all()
        
        # Fetch actual AI test results
        ai_test_results = db.query(StudentTestResult).filter(StudentTestResult.student_roll == roll_number).all()
        
        analytics_data = []

        # Map internal marks
        for perf in internal_performances:
            analytics_data.append({
                "source": "Internal Excel Upload",
                "subject": perf.subject,
                "score": perf.totalMarks,
                "max_score": 100, # Assuming internal marks are out of 100
                "date": str(perf.uploadedAt).split(' ')[0]
            })

        # Map AI Tests
        for result in ai_test_results:
            # We need the subject name from the Test table
            test = db.query(Test).filter(Test.id == result.test_id).first()
            subject_name = test.subject if test else "Unknown Test"
            
            # Normalize score to percentage for fair comparison, or just send raw values 
            # (Recharts can handle multiple domain setups, but standardizing helps)
            analytics_data.append({
                "source": "AI Generated Test",
                "subject": subject_name,
                "score": result.score,
                "max_score": result.total_questions,
                "date": str(result.submitted_at).split(' ')[0]
            })

        return analytics_data

    finally:
        db.close()


@app.get("/api/performance/class")
async def get_class_performance(year: str, branch: str, section: str):
    """
    Fetches the combined performance for an entire class (for the Class & Student Graphs).
    """
    db: Session = SessionLocal()
    try:
        student_map = {}

        # 1. Fetch uploaded performance
        performances = db.query(StudentPerformance).filter(
            StudentPerformance.year == year,
            StudentPerformance.branch == branch,
            StudentPerformance.section == section
        ).all()
        
        for p in performances:
            roll = p.rollNumber
            if roll not in student_map:
                student_map[roll] = {
                    "rollNumber": roll,
                    "name": p.name,
                    "subjects": {},
                    "totalMarks": 0,
                    "averageMarks": 0
                }
            
            sub_marks = p.final_combined_score if p.final_combined_score is not None else p.totalMarks
            
            student_map[roll]["subjects"][p.subject] = {
                "subjectName": p.subject,
                "marks": p.totalMarks,
                "assessmentScore": p.assessment_score if p.assessment_score is not None else 0,
                "finalScore": sub_marks,
                "hasUploaded": True,
                "testScores": []
            }

        # 2. Fetch standalone test submissions that match the demographics
        test_results = db.query(StudentTestResult, Test, Student).join(
            Test, StudentTestResult.test_id == Test.id
        ).join(
            Student, StudentTestResult.student_roll == Student.rollNumber
        ).filter(
            Test.year == year,
            Test.branch == branch,
            Test.section == section
        ).all()

        for result, test, student in test_results:
            roll = result.student_roll
            if roll not in student_map:
                student_map[roll] = {
                    "rollNumber": roll,
                    "name": student.name,
                    "subjects": {},
                    "totalMarks": 0,
                    "averageMarks": 0
                }

            if test.subject not in student_map[roll]["subjects"]:
                student_map[roll]["subjects"][test.subject] = {
                    "subjectName": test.subject,
                    "marks": 0,
                    "assessmentScore": 0,
                    "finalScore": 0,
                    "hasUploaded": False,
                    "testScores": []
                }
                
            pct = (result.score / result.total_questions) * 100 if result.total_questions > 0 else 0
            student_map[roll]["subjects"][test.subject]["testScores"].append(pct)

        # 3. Calculate averages and combine safely
        students_list = []
        for roll, data in student_map.items():
            final_subjects_list = []
            
            for subj, sub_data in data["subjects"].items():
                if len(sub_data["testScores"]) > 0:
                    avg_test = sum(sub_data["testScores"]) / len(sub_data["testScores"])
                    
                    if sub_data["hasUploaded"]:
                        # Tally both together:
                        sub_data["assessmentScore"] = avg_test
                        sub_data["finalScore"] = (sub_data["marks"] + avg_test) / 2
                    else:
                        sub_data["assessmentScore"] = avg_test
                        sub_data["finalScore"] = avg_test
                
                # Cleanup internal fields
                compiled_sub = {
                    "subjectName": sub_data["subjectName"],
                    "marks": sub_data["marks"],
                    "assessmentScore": sub_data["assessmentScore"],
                    "finalScore": sub_data["finalScore"]
                }
                final_subjects_list.append(compiled_sub)
                data["totalMarks"] += sub_data["finalScore"]
                
            data["subjects"] = final_subjects_list
            subs = len(final_subjects_list)
            if subs > 0:
                data["averageMarks"] = data["totalMarks"] / subs
            students_list.append(data)

        return {
            "year": year,
            "branch": branch,
            "section": section,
            "students": students_list
        }

    finally:
        db.close()


@app.post("/api/upload-marks")
async def upload_marks(
    file: UploadFile = File(...),
    year: str = Form(...),
    branch: str = Form(...),
    section: str = Form(...),
    subject: str = Form(...),
    uploadedBy: str = Form(...)
):
    """
    Endpoint to process an uploaded Excel sheet containing student marks.
    Extracts 'Roll Number', 'Name', and 'Marks', then stores them in SQLite.
    """
    # Validate file type
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only .xlsx and .xls are supported."
        )

    try:
        # Read the uploaded file into a Pandas DataFrame
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))

        # Dynamically detect required columns
        roll_col = next((c for c in df.columns if 'roll' in str(c).lower()), None)
        name_col = next((c for c in df.columns if 'name' in str(c).lower()), None)
        marks_col = next(
            (c for c in df.columns if any(
                keyword in str(c).lower() for keyword in ['mark', 'score', 'total']
            )),
            None
        )

        if not marks_col:
            raise HTTPException(
                status_code=400,
                detail="Could not detect a Marks/Score column in the uploaded file."
            )

        # Fallback if specific columns aren't found
        roll_col = roll_col if roll_col else df.columns[0]
        name_col = name_col if name_col else df.columns[1]

        # Extract only the necessary columns and filter out missing marks
        extracted_data = df[[roll_col, name_col, marks_col]].dropna(subset=[marks_col])

        # Open DB Session
        db = SessionLocal()
        parsed_results = []
        
        # Determine the maximum mark in the file for normalization
        max_total_in_file = extracted_data[marks_col].max()
        if max_total_in_file == 0 or pd.isna(max_total_in_file):
            max_total_in_file = 100 # Fallback to prevent divide-by-zero

        for index, row in extracted_data.iterrows():
            try:
                roll = str(row[roll_col])
                student_name = str(row[name_col])
                marks = float(row[marks_col])

                # Exclude invalid parsed rows (e.g headers caught as data)
                if pd.isna(marks) or not roll.strip():
                    continue

                # 1. Normalize the score
                normalized_score = (marks / max_total_in_file) * 100

                # 2. Look up existing Assessment Scores for this Subject
                # We need to find tests for this subject that the student has taken
                taken_tests = db.query(StudentTestResult, Test).join(
                    Test, StudentTestResult.test_id == Test.id
                ).filter(
                    StudentTestResult.student_roll == roll,
                    Test.subject == subject
                ).all()

                assessment_score = 0
                if taken_tests:
                    # Calculate average percentage across all AI tests taken for this subject
                    total_test_pct = 0
                    for tr, t in taken_tests:
                        pct = (tr.score / tr.total_questions) * 100 if tr.total_questions > 0 else 0
                        total_test_pct += pct
                    assessment_score = total_test_pct / len(taken_tests)
                
                # 3. Calculate Final Combined
                # If they haven't taken a test, we can just use the normalized score, or treat assessment as 0. Let's average if they have tests, else just normalized
                if taken_tests:
                    final_combined_score = (normalized_score + assessment_score) / 2
                else:
                    final_combined_score = normalized_score

                # 4. Determine Performance Category
                if final_combined_score >= 85:
                    performance_category = "Excellent"
                elif final_combined_score >= 70:
                    performance_category = "Good"
                elif final_combined_score >= 50:
                    performance_category = "Average"
                else:
                    performance_category = "Needs Improvement"

                student_record = StudentPerformance(
                    rollNumber=roll,
                    name=student_name,
                    totalMarks=marks,
                    subject=subject,
                    year=year,
                    branch=branch,
                    section=section,
                    uploadedBy=uploadedBy,
                    normalized_score=normalized_score,
                    assessment_score=assessment_score,
                    final_combined_score=final_combined_score,
                    performance_category=performance_category
                )
                db.add(student_record)

                parsed_results.append({
                    "rollNumber": roll,
                    "name": student_name,
                    "marks": marks,
                    "normalized": round(normalized_score, 2),
                    "assessment": round(assessment_score, 2),
                    "finalScore": round(final_combined_score, 2),
                    "category": performance_category
                })
            except Exception as row_error:
                print(f"Error parsing row {index}: {row_error}")
                continue

        db.commit()
        db.close()

        # Calculate brief stats to return
        if not parsed_results:
            raise HTTPException(status_code=400, detail="No valid data could be extracted.")

        return {
            "message": f"Successfully parsed and categorized {len(parsed_results)} records.",
            "data": parsed_results
        }

    except HTTPException:
        # Re-raise known exceptions cleanly
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error processing the file: {str(e)}"
        ) from e


@app.post("/api/jobs")
async def create_job(request: JobCreateRequest):
    """
    Creates a new job posting for a specific class.
    """
    db = SessionLocal()
    try:
        new_job = Job(
            title=request.title,
            description=request.description,
            company=request.company,
            year=request.year,
            branch=request.branch,
            section=request.section,
            posted_by=request.posted_by
        )
        db.add(new_job)
        db.commit()
        return {"message": "Job posted successfully", "id": new_job.id}
    finally:
        db.close()

@app.get("/api/jobs")
async def get_all_jobs():
    """
    Fetches all jobs regardless of demographic (useful for TPO).
    """
    db = SessionLocal()
    try:
        jobs = db.query(Job).order_by(Job.posted_at.desc()).all()
        return jobs
    finally:
        db.close()

@app.get("/api/student/{rollNumber}/jobs")
async def get_student_jobs(rollNumber: str):
    """
    Fetches jobs specifically designated for the student's year, branch, and section.
    """
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.rollNumber == rollNumber).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        jobs = db.query(Job).filter(
            Job.year == student.year
        ).order_by(Job.posted_at.desc()).all()
        
        return jobs
    finally:
        db.close()

class UpdateTpoPasswordRequest(BaseModel):
    newPassword: str

@app.put("/api/admin/tpo/password")
async def update_tpo_password(request: UpdateTpoPasswordRequest):
    """
    Allows the super admin to forcefully overwrite the TPO account's password.
    """
    db = SessionLocal()
    try:
        tpo_user = db.query(Teacher).filter(Teacher.role == "tpo").first()
        if not tpo_user:
            raise HTTPException(status_code=404, detail="TPO account not initialized.")
        
        tpo_user.password = request.newPassword # Depending on architecture this might need hash_password() but Faculty passwords are cleartext in this local schema
        db.commit()
        return {"message": "TPO password updated successfully"}
    finally:
        db.close()


@app.post("/api/analytics/generate/{student_roll}")
async def generate_student_analytics(student_roll: str):
    """
    Generates intelligent analytics for a student based on their marks and tests.
    """
    db: Session = SessionLocal()
    try:
        student = db.query(Student).filter(Student.rollNumber == student_roll).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        # 1. Fetch all performance data
        internal_performances = db.query(StudentPerformance).filter(StudentPerformance.rollNumber == student_roll).all()
        ai_test_results = db.query(StudentTestResult, Test).join(
            Test, StudentTestResult.test_id == Test.id
        ).filter(StudentTestResult.student_roll == student_roll).order_by(StudentTestResult.submitted_at.asc()).all()

        total_score = 0
        total_max = 0
        subject_scores = {} # subject -> list of percentages
        test_history_pct = [] # chronological list of percentages for trend
        
        # Process Internal Marks
        for perf in internal_performances:
            pct = (perf.totalMarks / 100) * 100 if perf.totalMarks else 0 # Assuming out of 100 max
            if pct > 100: pct = 100
            total_score += pct
            total_max += 100
            if perf.subject not in subject_scores:
                subject_scores[perf.subject] = []
            subject_scores[perf.subject].append(pct)

        # Process AI Tests
        for result, test in ai_test_results:
            pct = (result.score / result.total_questions) * 100 if result.total_questions > 0 else 0
            total_score += pct
            total_max += 100
            if test.subject not in subject_scores:
                subject_scores[test.subject] = []
            subject_scores[test.subject].append(pct)
            test_history_pct.append(pct)

        # Calculate Average
        average_score = (total_score / total_max) * 100 if total_max > 0 else 0
        
        # Determine Performance Level (Matched with Frontend Categories)
        if average_score >= 85:
            performance_level = "Excellent"
        elif average_score >= 70:
            performance_level = "Good"
        elif average_score >= 50:
            performance_level = "Average"
        else:
            performance_level = "Below Average"

        # Detect Weak Subjects (< 40)
        weak_subjects_list = []
        subject_averages = {}
        for sub, scores in subject_scores.items():
            sub_avg = sum(scores) / len(scores) if scores else 0
            subject_averages[sub] = sub_avg
            if sub_avg < 40:
                weak_subjects_list.append(sub)

        # Rule Engine for Pattern Detection (WHY Analysis)
        reasons = []
        recommendations = []
        
        # Simple generalized rules based on keywords in subject string mapping
        dsa_score = next((sub_avg for sub, sub_avg in subject_averages.items() if "dsa" in sub.lower() or "data struct" in sub.lower()), None)
        leetcode_score = next((sub_avg for sub, sub_avg in subject_averages.items() if "leetcode" in sub.lower() or "competitive" in sub.lower()), None)
        crt_score = next((sub_avg for sub, sub_avg in subject_averages.items() if "crt" in sub.lower() or "reasoning" in sub.lower()), None)
        aptitude_score = next((sub_avg for sub, sub_avg in subject_averages.items() if "aptitude" in sub.lower() or "quant" in sub.lower()), None)
        comm_score = next((sub_avg for sub, sub_avg in subject_averages.items() if "communication" in sub.lower() or "english" in sub.lower()), None)

        if dsa_score is not None and dsa_score < 40:
            reasons.append("Low coding practice and poor understanding of core DSA concepts.")
            recommendations.append("Practice at least 2 DSA problems daily on LeetCode/GeeksforGeeks.")
            
        if comm_score is not None and comm_score < 50:
            reasons.append("Weak communication skills impacting overall profile.")
            recommendations.append("Participate in group discussions and practice speaking exercises daily.")
            
        if crt_score is not None and aptitude_score is not None and crt_score < 40 and aptitude_score < 40:
            reasons.append("Weak problem-solving foundation.")
            recommendations.append("Focus on basic quantitative aptitude and logical reasoning concepts before advanced CRT.")
            
        if not reasons and average_score < 50:
            reasons.append("Overall low engagement with the course material.")
            recommendations.append("Create a strict daily study schedule and attend all classes regularly.")
            
        if not recommendations and performance_level == "Excellent":
            reasons.append("Consistent performance across subjects.")
            recommendations.append("Maintain the current momentum and start participating in advanced hackathons or projects.")
        elif not recommendations:
            reasons.append(f"Struggling in {', '.join(weak_subjects_list)}" if weak_subjects_list else "Average performance needing slight push.")
            for weak in weak_subjects_list:
                recommendations.append(f"Revise core concepts of {weak} and solve previous year question papers.")

        # Performance Prediction & Trend
        trend = "Stable"
        predicted_score = average_score
        risk_level = "Low"
        
        if len(test_history_pct) >= 3:
            latest = test_history_pct[-1]
            previous = test_history_pct[-2]
            older = test_history_pct[-3]
            
            if latest < previous and previous < older:
                trend = "Declining"
                risk_level = "High"
            elif latest > previous and previous > older:
                trend = "Improving"
            elif latest < average_score:
                trend = "Slight Drop"
                risk_level = "Moderate"

            # Simple prediction formula
            predicted_score = (latest + previous) / 2
        elif len(test_history_pct) == 2:
            if test_history_pct[1] < test_history_pct[0]:
                trend = "Declining"
                risk_level = "Moderate"
            elif test_history_pct[1] > test_history_pct[0]:
                trend = "Improving"
            predicted_score = (test_history_pct[0] + test_history_pct[1]) / 2

        if average_score < 40:
            risk_level = "High"

        # Save to DB
        profile = db.query(StudentAnalyticsProfile).filter(StudentAnalyticsProfile.student_roll == student_roll).first()
        if not profile:
            profile = StudentAnalyticsProfile(student_roll=student_roll)
            db.add(profile)
            
        profile.average_score = round(average_score, 2)
        profile.performance_level = performance_level
        profile.weak_subjects = json.dumps(weak_subjects_list)
        profile.reason = json.dumps(reasons)
        profile.recommendations = json.dumps(recommendations)
        profile.trend = trend
        profile.predicted_score = round(predicted_score, 2)
        profile.risk_level = risk_level
        profile.last_updated = datetime.utcnow()
        
        db.commit()

        return {
            "message": "Analytics generated successfully.",
            "profile": {
                "student_roll": profile.student_roll,
                "average_score": profile.average_score,
                "performance_level": profile.performance_level,
                "weak_subjects": json.loads(profile.weak_subjects),
                "reasons": json.loads(profile.reason),
                "recommendations": json.loads(profile.recommendations),
                "trend": profile.trend,
                "predicted_score": profile.predicted_score,
                "risk_level": profile.risk_level
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@app.get("/api/analytics/profile/{student_roll}")
async def get_student_analytics_profile(student_roll: str):
    """
    Retrieves the generated intelligent analytics profile for a student.
    """
    db: Session = SessionLocal()
    try:
        profile = db.query(StudentAnalyticsProfile).filter(StudentAnalyticsProfile.student_roll == student_roll).first()
        if not profile:
            return {"message": "Profile not found", "profile": None}
            
        return {
            "student_roll": profile.student_roll,
            "average_score": profile.average_score,
            "performance_level": profile.performance_level,
            "weak_subjects": json.loads(profile.weak_subjects) if profile.weak_subjects else [],
            "reasons": json.loads(profile.reason) if profile.reason else [],
            "recommendations": json.loads(profile.recommendations) if profile.recommendations else [],
            "trend": profile.trend,
            "predicted_score": profile.predicted_score,
            "risk_level": profile.risk_level,
            "last_updated": profile.last_updated
        }
    finally:
        db.close()


@app.get("/api/analytics/class/{year}/{branch}/{section}")
async def get_class_analytics(year: str, branch: str, section: str):
    """
    Retrieves class-level intelligent insights.
    """
    db: Session = SessionLocal()
    try:
        students = db.query(Student).filter(
            Student.year == year,
            Student.branch == branch,
            Student.section == section
        ).all()
        
        rolls = [s.rollNumber for s in students]
        if not rolls:
            return {"message": "No students found in this class."}
            
        profiles = db.query(StudentAnalyticsProfile).filter(StudentAnalyticsProfile.student_roll.in_(rolls)).all()
        
        if not profiles:
            return {"message": "No analytics data available for this class.", "profiles_found": 0}
            
        total_score = 0
        weak_subjects_freq = {}
        top_scorer = {"name": "", "score": -1}
        lowest_scorer = {"name": "", "score": 101}
        risk_dist = {"High": 0, "Moderate": 0, "Low": 0}
        performance_dist = {"Strong": 0, "Average": 0, "Weak": 0}
        weak_students = []
        risk_students = []
        
        student_roll_to_name = {s.rollNumber: s.name for s in students}
        
        for p in profiles:
            total_score += p.average_score
            name = student_roll_to_name.get(p.student_roll, "Unknown")
            
            if p.average_score > top_scorer["score"]:
                top_scorer = {"name": name, "roll": p.student_roll, "score": p.average_score}
            if p.average_score < lowest_scorer["score"]:
                lowest_scorer = {"name": name, "roll": p.student_roll, "score": p.average_score}
                
            risk_dist[p.risk_level] = risk_dist.get(p.risk_level, 0) + 1
            performance_dist[p.performance_level] = performance_dist.get(p.performance_level, 0) + 1
            
            if p.performance_level == "Weak":
                weak_students.append({"name": name, "roll": p.student_roll, "score": p.average_score})
            if p.risk_level == "High" or p.risk_level == "Moderate":
                risk_students.append({"name": name, "roll": p.student_roll, "trend": p.trend, "risk": p.risk_level})
                
            if p.weak_subjects:
                subs = json.loads(p.weak_subjects)
                for sub in subs:
                    weak_subjects_freq[sub] = weak_subjects_freq.get(sub, 0) + 1
                    
        class_average = total_score / len(profiles) if profiles else 0
        
        # Format weak subject frequency for Recharts
        subject_difficulty = [{"subject": k, "weak_students_count": v} for k, v in weak_subjects_freq.items()]
        
        # Calculate percentage of weak students in each subject
        for sd in subject_difficulty:
            sd["weak_percentage"] = round((sd["weak_students_count"] / len(profiles)) * 100, 1)

        return {
            "class_average": round(class_average, 2),
            "total_students_analyzed": len(profiles),
            "top_scorer": top_scorer,
            "lowest_scorer": lowest_scorer,
            "performance_distribution": performance_dist,
            "risk_distribution": risk_dist,
            "subject_difficulty": subject_difficulty,
            "weak_students": weak_students,
            "risk_students": risk_students
        }
    finally:
        db.close()

# ─────────────────────────────────────────────
# F-08: At-Risk Student Auto Flagging
# ─────────────────────────────────────────────
@app.get("/api/performance/at-risk")
async def get_at_risk_students(branch: str = "All", year: str = "All", section: str = "All", threshold: float = 40.0):
    """F-08: Return students flagged as at-risk based on average score below threshold"""
    db: Session = SessionLocal()
    try:
        query = db.query(StudentAnalyticsProfile)
        profiles = query.all()
        at_risk = []
        for p in profiles:
            if p.average_score is None:
                continue
            student = db.query(Student).filter(Student.rollNumber == p.student_roll).first()
            if not student:
                continue
            if branch != "All" and student.branch != branch:
                continue
            if year != "All" and student.year != year:
                continue
            if section != "All" and student.section != section:
                continue
            if p.average_score < threshold:
                at_risk.append({
                    "rollNumber": student.rollNumber,
                    "name": student.name,
                    "branch": student.branch,
                    "year": student.year,
                    "section": student.section,
                    "average_score": round(p.average_score, 1),
                    "performance": p.performance_level if hasattr(p, 'performance_level') else "Unknown",
                    "performance_category": p.performance_level if hasattr(p, 'performance_level') else "Unknown",
                    "risk_level": p.risk_level or ("High" if p.average_score < 30 else "Medium"),
                    "tests_taken": getattr(p, 'total_tests_taken', 0)
                })
        # Sort by score ascending (worst first)
        at_risk.sort(key=lambda x: x["average_score"])
        return at_risk
    finally:
        db.close()


# ─────────────────────────────────────────────
# F-09: Subject Comparison Across Sections
# ─────────────────────────────────────────────
@app.get("/api/performance/cross-section-comparison")
async def cross_section_comparison(subject: str, year: str, branch: str):
    """F-09: Compare subject performance across all sections for a given year/branch"""
    db: Session = SessionLocal()
    try:
        students = db.query(Student).filter(
            Student.year == year,
            Student.branch == branch
        ).all()

        section_data: dict = {}
        for student in students:
            profile = db.query(StudentAnalyticsProfile).filter(
                StudentAnalyticsProfile.student_roll == student.rollNumber
            ).first()
            if not profile or not profile.marks_summary:
                continue
            marks = profile.marks_summary
            score = marks.get(subject)
            if score is None:
                continue
            sec = student.section or "Unknown"
            if sec not in section_data:
                section_data[sec] = {"scores": [], "section": sec}
            section_data[sec]["scores"].append(score)

        result = []
        for sec, data in section_data.items():
            scores = data["scores"]
            result.append({
                "section": sec,
                "average": round(sum(scores) / len(scores), 1) if scores else 0,
                "highest": max(scores) if scores else 0,
                "lowest": min(scores) if scores else 0,
                "count": len(scores)
            })
        result.sort(key=lambda x: x["section"])
        return result
    finally:
        db.close()


# ─────────────────────────────────────────────
# F-12: Placement Statistics Dashboard
# ─────────────────────────────────────────────
@app.get("/api/placement/stats")
async def get_placement_stats():
    """F-12: Aggregated placement statistics for HOD/Admin"""
    db: Session = SessionLocal()
    try:
        all_stages = db.query(ApplicationStageHistory).all()

        placed_students = set()
        company_counts: dict = {}
        branch_placed: dict = {}
        year_placed: dict = {}

        for entry in all_stages:
            if entry.stage in ["Placed", "Offer Extended"]:
                placed_students.add(entry.roll_number)
                company_counts[entry.company] = company_counts.get(entry.company, 0) + 1
                # Get student branch/year
                student = db.query(Student).filter(Student.rollNumber == entry.roll_number).first()
                if student:
                    branch_placed[student.branch] = branch_placed.get(student.branch, 0) + 1
                    year_placed[student.year] = year_placed.get(student.year, 0) + 1

        total_students = db.query(Student).count()
        total_placed = len(placed_students)
        placement_rate = round((total_placed / total_students * 100), 1) if total_students > 0 else 0

        top_companies = sorted(company_counts.items(), key=lambda x: x[1], reverse=True)[:5]

        return {
            "total_students": total_students,
            "total_placed": total_placed,
            "placement_rate": placement_rate,
            "top_companies": [{"company": c[0], "count": c[1]} for c in top_companies],
            "by_branch": [{"branch": k, "count": v} for k, v in branch_placed.items()],
            "by_year": [{"year": k, "count": v} for k, v in year_placed.items()],
        }
    finally:
        db.close()


# ─────────────────────────────────────────────
# F-13: Job Application Status Timeline
# ─────────────────────────────────────────────
@app.get("/api/students/{roll_number}/application-timeline")
async def get_application_timeline(roll_number: str):
    """F-13: Return full application stage timeline for a student"""
    db: Session = SessionLocal()
    try:
        stages = db.query(ApplicationStageHistory).filter(
            ApplicationStageHistory.roll_number == roll_number
        ).order_by(ApplicationStageHistory.updated_at.desc()).all()
        return [
            {
                "id": s.id,
                "company": s.company,
                "job_id": s.job_id,
                "stage": s.stage,
                "updated_at": s.updated_at.isoformat() if s.updated_at else None,
                "updated_by": s.updated_by
            } for s in stages
        ]
    finally:
        db.close()

@app.post("/api/application-stage")
async def update_application_stage(
    roll_number: str = Form(...),
    job_id: int = Form(...),
    company: str = Form(...),
    stage: str = Form(...),
    updated_by: str = Form(...)
):
    """F-13: TPO updates job application stage for a student"""
    db: Session = SessionLocal()
    try:
        entry = ApplicationStageHistory(
            roll_number=roll_number,
            job_id=job_id,
            company=company,
            stage=stage,
            updated_by=updated_by
        )
        db.add(entry)
        # Write audit log
        log = AuditLog(actorUsername=updated_by, actorRole="tpo",
                       action="UPDATE_APPLICATION_STAGE",
                       entityType="Application", entityId=str(roll_number),
                       details=f"Stage set to {stage} for job {job_id}")
        db.add(log)
        db.commit()
        return {"message": "Stage updated successfully"}
    finally:
        db.close()


# ─────────────────────────────────────────────
# F-14: Predictive Performance Score
# ─────────────────────────────────────────────
@app.get("/api/students/{roll_number}/predictions")
async def get_student_predictions(roll_number: str):
    """F-14: Simple linear-regression-based score prediction using test history"""
    db: Session = SessionLocal()
    try:
        results = db.query(StudentTestResult).filter(
            StudentTestResult.student_roll == roll_number
        ).order_by(StudentTestResult.submitted_at).all()

        if len(results) < 2:
            return {"predicted_score": None, "trend": "insufficient_data", "message": "Need at least 2 test attempts for prediction"}

        scores = [r.percentage for r in results if r.percentage is not None]
        if len(scores) < 2:
            return {"predicted_score": None, "trend": "insufficient_data"}

        # Simple linear regression
        n = len(scores)
        x = list(range(n))
        x_mean = sum(x) / n
        y_mean = sum(scores) / n
        numerator = sum((x[i] - x_mean) * (scores[i] - y_mean) for i in range(n))
        denominator = sum((x[i] - x_mean) ** 2 for i in range(n))
        slope = numerator / denominator if denominator != 0 else 0
        intercept = y_mean - slope * x_mean
        predicted = intercept + slope * (n)  # predict next attempt
        predicted = max(0.0, min(100.0, predicted))

        trend = "improving" if slope > 1 else ("declining" if slope < -1 else "stable")

        return {
            "predicted_score": round(predicted, 1),
            "trend": trend,
            "slope": round(slope, 2),
            "current_average": round(y_mean, 1),
            "attempts_count": n,
            "confidence": "low" if n < 5 else "medium" if n < 10 else "high"
        }
    finally:
        db.close()


# ─────────────────────────────────────────────
# F-15: AI Insights Caching
# ─────────────────────────────────────────────
@app.get("/api/insights-cache/{entity_id}")
async def get_cached_insights(entity_id: str, entity_type: str = "student"):
    """F-15: Return cached AI insights for entity"""
    db: Session = SessionLocal()
    try:
        cache = db.query(InsightCache).filter(
            InsightCache.entity_id == entity_id,
            InsightCache.entity_type == entity_type
        ).first()
        if not cache:
            return {"cached": False}
        return {
            "cached": True,
            "insight_text": cache.insight_text,
            "generated_at": cache.generated_at.isoformat() if cache.generated_at else None
        }
    finally:
        db.close()

@app.post("/api/insights-cache")
async def save_insight_cache(
    entity_id: str = Form(...),
    entity_type: str = Form(...),
    insight_text: str = Form(...),
    data_hash: str = Form(default="")
):
    """F-15: Save or update cached AI insights"""
    db: Session = SessionLocal()
    try:
        existing = db.query(InsightCache).filter(
            InsightCache.entity_id == entity_id,
            InsightCache.entity_type == entity_type
        ).first()
        if existing:
            existing.insight_text = insight_text
            existing.data_hash = data_hash
            existing.generated_at = datetime.utcnow()
        else:
            cache = InsightCache(
                entity_id=entity_id,
                entity_type=entity_type,
                insight_text=insight_text,
                data_hash=data_hash
            )
            db.add(cache)
        db.commit()
        return {"message": "Insight cached successfully"}
    finally:
        db.close()


# ─────────────────────────────────────────────
# F-16/F-19: Branch & Year Analytics + System Stats
# ─────────────────────────────────────────────

@app.get("/api/admin/stats")
async def get_admin_stats():
    """F-19: System health and statistics panel"""
    db: Session = SessionLocal()
    try:
        total_students = db.query(Student).count()
        total_faculty = db.query(Teacher).count()
        total_tests = db.query(Test).count()
        total_results = db.query(StudentTestResult).count()
        total_jobs = db.query(Job).count()
        total_announcements = db.query(Announcement).count()
        total_resources = db.query(SubjectResource).count()

        # Average system performance
        profiles = db.query(StudentAnalyticsProfile).filter(
            StudentAnalyticsProfile.average_score != None
        ).all()
        avg_system_score = round(
            sum(p.average_score for p in profiles) / len(profiles), 1
        ) if profiles else 0

        return {
            "total_students": total_students,
            "total_faculty": total_faculty,
            "total_tests": total_tests,
            "total_results": total_results,
            "total_jobs": total_jobs,
            "total_announcements": total_announcements,
            "total_resources": total_resources,
            "avg_system_score": avg_system_score,
            "profiles_generated": len(profiles),
        }
    finally:
        db.close()

@app.get("/api/admin/branch-analytics")
async def get_branch_analytics():
    """F-16: Branch and year level analytics for Admin"""
    db: Session = SessionLocal()
    try:
        profiles = db.query(StudentAnalyticsProfile).filter(
            StudentAnalyticsProfile.average_score != None
        ).all()

        branch_year_data: dict = {}
        for p in profiles:
            student = db.query(Student).filter(Student.rollNumber == p.student_roll).first()
            if not student:
                continue
            key = f"{student.branch}|{student.year}"
            if key not in branch_year_data:
                branch_year_data[key] = {
                    "branch": student.branch,
                    "year": student.year,
                    "scores": [],
                    "categories": {"Excellent": 0, "Good": 0, "Average": 0, "Below Average": 0, "At Risk": 0}
                }
            branch_year_data[key]["scores"].append(p.average_score)
            cat = p.performance_level or "Average"
            if cat in branch_year_data[key]["categories"]:
                branch_year_data[key]["categories"][cat] += 1

        result = []
        for key, data in branch_year_data.items():
            scores = data["scores"]
            result.append({
                "branch": data["branch"],
                "year": data["year"],
                "average_score": round(sum(scores) / len(scores), 1) if scores else 0,
                "total_students": len(scores),
                "distribution": data["categories"]
            })
        result.sort(key=lambda x: (x["branch"], x["year"]))
        
        # System top performers
        top_profiles = db.query(StudentAnalyticsProfile).order_by(StudentAnalyticsProfile.average_score.desc()).limit(5).all()
        top_performers = []
        for tp in top_profiles:
            s = db.query(Student).filter(Student.rollNumber == tp.student_roll).first()
            if s:
                top_performers.append({"name": s.name, "roll": s.rollNumber, "score": tp.average_score, "branch": s.branch})

        return {
            "analytics": result,
            "top_performers": top_performers
        }
    finally:
        db.close()


# ─────────────────────────────────────────────
# F-17: Date Range Filtering for Performance
# ─────────────────────────────────────────────
@app.get("/api/performance/marks-in-range")
async def get_marks_in_date_range(
    branch: str = "All",
    year: str = "All",
    section: str = "All",
    from_date: str = None,
    to_date: str = None
):
    """F-17: Filter performance data by custom date range"""
    db: Session = SessionLocal()
    try:
        from sqlalchemy import and_
        query = db.query(StudentAnalyticsProfile)
        profiles = query.all()

        # Filter test results by date range
        result_query = db.query(StudentTestResult)
        if from_date:
            result_query = result_query.filter(StudentTestResult.submitted_at >= datetime.fromisoformat(from_date))
        if to_date:
            result_query = result_query.filter(StudentTestResult.submitted_at <= datetime.fromisoformat(to_date))
        results_in_range = result_query.all()

        # Build student-to-scores mapping
        student_scores: dict = {}
        for r in results_in_range:
            if r.percentage:
                if r.student_roll not in student_scores:
                    student_scores[r.student_roll] = []
                student_scores[r.student_roll].append(r.percentage)

        aggregated = []
        for roll, scores in student_scores.items():
            student = db.query(Student).filter(Student.rollNumber == roll).first()
            if not student:
                continue
            if branch != "All" and student.branch != branch:
                continue
            if year != "All" and student.year != year:
                continue
            if section != "All" and student.section != section:
                continue
            aggregated.append({
                "rollNumber": student.rollNumber,
                "name": student.name,
                "branch": student.branch,
                "year": student.year,
                "section": student.section,
                "average_in_range": round(sum(scores) / len(scores), 1),
                "tests_in_range": len(scores)
            })
        aggregated.sort(key=lambda x: x["average_in_range"], reverse=True)
        return aggregated
    finally:
        db.close()


# ─────────────────────────────────────────────
# F-18: Audit Log Viewer
# ─────────────────────────────────────────────
@app.get("/api/admin/audit-log")
async def get_audit_log(page: int = 1, limit: int = 20, actor: str = None, action: str = None):
    """F-18: Paginated audit log for admin"""
    db: Session = SessionLocal()
    try:
        query = db.query(AuditLog).order_by(AuditLog.timestamp.desc())
        if actor:
            query = query.filter(AuditLog.actorUsername == actor)
        if action:
            query = query.filter(AuditLog.action == action)
        total = query.count()
        logs = query.offset((page - 1) * limit).limit(limit).all()
        return {
            "total": total,
            "page": page,
            "limit": limit,
            "logs": [
                {
                    "id": log.id,
                    "actorUsername": log.actorUsername,
                    "actorRole": log.actorRole,
                    "action": log.action,
                    "entityType": log.entityType,
                    "entityId": log.entityId,
                    "details": log.details,
                    "timestamp": log.timestamp.isoformat() if log.timestamp else None
                } for log in logs
            ]
        }
    finally:
        db.close()


# ─────────────────────────────────────────────
# F-06: Bulk Test Question Import via CSV/Excel
# ─────────────────────────────────────────────
@app.post("/api/tests/import-questions")
async def import_test_questions(
    test_id: int = Form(...),
    file: UploadFile = File(...)
):
    """F-06: Import questions for a test from Excel/CSV file"""
    db: Session = SessionLocal()
    try:
        test = db.query(Test).filter(Test.id == test_id).first()
        if not test:
            raise HTTPException(status_code=404, detail="Test not found")

        contents = await file.read()
        if file.filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))

        # Expected columns: question_text, option_a, option_b, option_c, option_d, correct_answer
        required_cols = {"question_text", "option_a", "option_b", "option_c", "option_d", "correct_answer"}
        df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
        if not required_cols.issubset(set(df.columns)):
            raise HTTPException(status_code=400, detail=f"Missing columns. Required: {required_cols}")

        imported = 0
        for _, row in df.iterrows():
            q = Question(
                test_id=test_id,
                question=str(row["question_text"]), # FIXED: Use 'question' column
                option_a=str(row["option_a"]),
                option_b=str(row["option_b"]),
                option_c=str(row["option_c"]),
                option_d=str(row["option_d"]),
                correct_answer=str(row["correct_answer"]).upper().strip()
            )
            db.add(q)
            imported += 1

        db.commit()
        # Log audit
        log = AuditLog(actorUsername="faculty", actorRole="faculty",
                       action="IMPORT_QUESTIONS", entityType="Test", entityId=str(test_id),
                       details=f"Imported {imported} questions from {file.filename}")
        db.add(log)
        db.commit()
        return {"message": f"Successfully imported {imported} questions"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")
    finally:
        db.close()


# ─────────────────────────────────────────────
# F-07: Weekly Class Performance Digest
# ─────────────────────────────────────────────
@app.get("/api/performance/weekly-digest")
async def get_weekly_digest(branch: str = "All", year: str = "All", section: str = "All"):
    """F-07: Generate weekly digest of class performance"""
    db: Session = SessionLocal()
    try:
        from datetime import timedelta
        week_ago = datetime.utcnow() - timedelta(days=7)

        # Get test results from last 7 days
        results = db.query(StudentTestResult).filter(
            StudentTestResult.submitted_at >= week_ago
        ).all()

        if not results:
            return {"message": "No test activity in the last 7 days", "summary": None}

        scores = [r.percentage for r in results if r.percentage is not None]
        avg = round(sum(scores) / len(scores), 1) if scores else 0
        top_score = max(scores) if scores else 0
        low_score = min(scores) if scores else 0

        # Top performers this week
        student_scores_map: dict = {}
        for r in results:
            if r.percentage:
                if r.student_roll not in student_scores_map:
                    student_scores_map[r.student_roll] = []
                student_scores_map[r.student_roll].append(r.percentage)

        top_performers = []
        for roll, sc in student_scores_map.items():
            avg_sc = sum(sc) / len(sc)
            if avg_sc >= 80:
                student = db.query(Student).filter(Student.rollNumber == roll).first()
                if student:
                    top_performers.append({"name": student.name, "rollNumber": roll, "avg": round(avg_sc, 1)})
        top_performers.sort(key=lambda x: x["avg"], reverse=True)

        # Below threshold
        at_risk_this_week = []
        for roll, sc in student_scores_map.items():
            avg_sc = sum(sc) / len(sc)
            if avg_sc < 40:
                student = db.query(Student).filter(Student.rollNumber == roll).first()
                if student:
                    at_risk_this_week.append({"name": student.name, "rollNumber": roll, "avg": round(avg_sc, 1)})

        return {
            "period": f"{week_ago.strftime('%Y-%m-%d')} to {datetime.utcnow().strftime('%Y-%m-%d')}",
            "summary": {
                "total_test_attempts": len(results),
                "class_average": avg,
                "highest_score": top_score,
                "lowest_score": low_score,
                "students_active": len(student_scores_map),
            },
            "top_performers": top_performers[:5],
            "at_risk_this_week": at_risk_this_week[:5]
        }
    finally:
        db.close()


@app.delete("/api/sections/{section_name}")
async def delete_section(section_name: str):
    """F-16: Remove a class section and cascadingly delete all student data within it."""
    db: Session = SessionLocal()
    try:
        # Normalize name
        sec_upper = section_name.upper()
        
        # 1. Delete from defined Section table
        section_entry = db.query(Section).filter(Section.name == sec_upper).first()
        if section_entry:
            db.delete(section_entry)
            
        # 2. Get all students in this section to delete their marks/results
        students_to_remove = db.query(Student).filter(Student.section == sec_upper).all()
        student_rolls = [s.rollNumber for s in students_to_remove]
        
        if student_rolls:
            # Delete Performance (Excel marks)
            db.query(StudentPerformance).filter(StudentPerformance.rollNumber.in_(student_rolls)).delete(synchronize_session=False)
            # Delete Test Results
            db.query(StudentTestResult).filter(StudentTestResult.student_roll.in_(student_rolls)).delete(synchronize_session=False)
            # Delete Goals
            db.query(StudentGoal).filter(StudentGoal.rollNumber.in_(student_rolls)).delete(synchronize_session=False)
            # Delete Students
            db.query(Student).filter(Student.section == sec_upper).delete(synchronize_session=False)
            
        db.commit()
        return {"message": f"Successfully deleted section {sec_upper} and all associated student records."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.delete("/api/years/{year_name}")
async def delete_year(year_name: str):
    """F-16: Delete all student data for a specific year."""
    db: Session = SessionLocal()
    try:
        # Correctly find students for that year
        # Note: year_name might be "1st Year", "2nd Year", etc.
        students_to_remove = db.query(Student).filter(Student.year == year_name).all()
        student_rolls = [s.rollNumber for s in students_to_remove]
        
        if student_rolls:
            db.query(StudentPerformance).filter(StudentPerformance.rollNumber.in_(student_rolls)).delete(synchronize_session=False)
            db.query(StudentTestResult).filter(StudentTestResult.student_roll.in_(student_rolls)).delete(synchronize_session=False)
            db.query(StudentGoal).filter(StudentGoal.rollNumber.in_(student_rolls)).delete(synchronize_session=False)
            db.query(Student).filter(Student.year == year_name).delete(synchronize_session=False)
            
        db.commit()
        return {"message": f"Successfully deleted year {year_name} records."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.get("/api/students")
async def get_all_students(
    branch: str = "all",
    year: str = "all",
    section: str = "all"
):
    """List all students with optional filters"""
    db: Session = SessionLocal()
    try:
        query = db.query(Student)
        if branch != "all":
            query = query.filter(Student.branch == branch)
        if year != "all":
            query = query.filter(Student.year == year)
        if section != "all":
            query = query.filter(Student.section == section)
            
        students = query.all()
        # Attach performance category from analytics profile if it exists
        results = []
        for s in students:
            profile = db.query(StudentAnalyticsProfile).filter(StudentAnalyticsProfile.student_roll == s.rollNumber).first()
            results.append({
                "id": s.id,
                "name": s.name,
                "rollNumber": s.rollNumber,
                "branch": s.branch,
                "year": s.year,
                "section": s.section,
                "performance": profile.performance_level if profile else "No Data"
            })
        return results
    finally:
        db.close()

@app.put("/api/students/{roll_number}")
async def update_student(roll_number: str, data: dict):
    """F-16: Admin update student details."""
    db: Session = SessionLocal()
    try:
        student = db.query(Student).filter(Student.rollNumber == roll_number).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Update fields if provided
        if "name" in data: student.name = data["name"]
        if "section" in data: 
            student.section = data["section"].upper().strip()
            # If manual section change, ensure it's in the sections table
            if not db.query(Section).filter(Section.name == student.section).first():
                new_sec = Section(name=student.section, branch=student.branch, year=student.year)
                db.add(new_sec)
        if "branch" in data: student.branch = data["branch"]
        if "year" in data: student.year = data["year"]
        
        # Admin can reset password as well
        if "password" in data and data["password"]:
            student.password = hash_password(data["password"])
        
        db.commit()
        return {"message": "Student updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.delete("/api/students/{roll_number}")
async def delete_single_student(roll_number: str):
    """F-16: Admin delete single student."""
    db: Session = SessionLocal()
    try:
        student = db.query(Student).filter(Student.rollNumber == roll_number).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Cascading delete data
        db.query(StudentPerformance).filter(StudentPerformance.rollNumber == roll_number).delete(synchronize_session=False)
        db.query(StudentTestResult).filter(StudentTestResult.student_roll == roll_number).delete(synchronize_session=False)
        db.query(StudentGoal).filter(StudentGoal.rollNumber == roll_number).delete(synchronize_session=False)
        db.delete(student)
        
        db.commit()
        return {"message": "Student deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.get("/api/subjects")
async def get_all_subjects():
    """List unique subjects currently in the system"""
    db: Session = SessionLocal()
    try:
        # Get unique subjects from tests, student performance, and faculty assignments
        test_subjects = db.query(Test.subject).distinct().all()
        perf_subjects = db.query(StudentPerformance.subject).distinct().all()
        faculty_subjects = db.query(Teacher.subject).distinct().all()
        
        all_subjects = list(set(
            [s[0] for s in test_subjects if s[0]] + 
            [s[0] for s in perf_subjects if s[0]] + 
            [s[0] for s in faculty_subjects if s[0]]
        ))
        
        return [{"id": i, "name": s} for i, s in enumerate(all_subjects)]
    finally:
        db.close()


# ─────────────────────────────────────────────
# Admin: Bulk Registration via Excel/CSV
# ─────────────────────────────────────────────
@app.post("/api/admin/bulk-students")
async def bulk_register_students(file: UploadFile = File(...)):
    """Bulk register students from Excel or CSV file"""
    db: Session = SessionLocal()
    try:
        contents = await file.read()
        if file.filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))

        # Required columns: name, roll_number, password, branch, year, section
        required_cols = {"name", "roll_number", "password"}
        df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
        
        if not required_cols.issubset(set(df.columns)):
            raise HTTPException(status_code=400, detail=f"Missing required columns: {required_cols}")

        count = 0
        skipped = 0
        for _, row in df.iterrows():
            roll = str(row["roll_number"]).strip()
            if db.query(Student).filter(Student.rollNumber == roll).first():
                skipped += 1
                continue
            
            section_name = str(row.get("section", "A")).upper().strip()
            # Note: Section synchronization is now handled in the dedicated phase after the loop to prevent duplicate insertion errors.

            new_student = Student(
                name=str(row["name"]),
                rollNumber=roll,
                password=hash_password(str(row["password"])),
                branch=str(row.get("branch", "CSE")),
                year=str(row.get("year", "1st Year")),
                section=section_name
            )
            db.add(new_student)
            count += 1
            
        db.commit()
        
        # FINAL SYNC: Ensure ALL unique sections from student table are ALSO in the Section metadata table
        # This addresses the user's issue about filters not showing everything correctly
        logger.info("Synchronizing Section Table with Student Data...")
        # Get unique section names first to avoid duplicates
        unique_section_names = db.query(Student.section).distinct().all()
        processed_sections = set()
        
        for (sec_name,) in unique_section_names:
            if not sec_name:
                continue
            
            norm_name = sec_name.upper().strip()
            if norm_name in processed_sections:
                continue
                
            processed_sections.add(norm_name)
            
            # check DB
            exists = db.query(Section).filter(Section.name == norm_name).first()
            if not exists:
                # Find the first student in this section to grab their metadata
                sample_stu = db.query(Student).filter(Student.section == sec_name).first()
                new_meta = Section(
                    name=norm_name, 
                    branch=sample_stu.branch if sample_stu else "N/A", 
                    year=sample_stu.year if sample_stu else "N/A"
                )
                db.add(new_meta)
        
        db.commit()

        # Audit log
        log = AuditLog(actorUsername="admin", actorRole="admin", action="BULK_REGISTER_STUDENTS",
                       details=f"Imported {count} students, skipped {skipped} duplicates")
        db.add(log)
        db.commit()
        return {"message": f"Successfully imported {count} students. Sections synchronized."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process file: {str(e)}")
    finally:
        db.close()

@app.post("/api/admin/bulk-faculty")
async def bulk_register_faculty(file: UploadFile = File(...)):
    """Bulk register faculty from Excel or CSV file"""
    db: Session = SessionLocal()
    try:
        contents = await file.read()
        if file.filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))

        # Required columns: name, username, password, subject
        required_cols = {"name", "username", "password"}
        df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
        
        if not required_cols.issubset(set(df.columns)):
            raise HTTPException(status_code=400, detail=f"Missing required columns: {required_cols}")

        count = 0
        skipped = 0
        for _, row in df.iterrows():
            uname = str(row["username"]).strip()
            if db.query(Teacher).filter(Teacher.username == uname).first():
                skipped += 1
                continue
            
            new_teacher = Teacher(
                name=str(row["name"]),
                username=uname,
                password=hash_password(str(row["password"])),
                subject=str(row.get("subject", "General"))
            )
            db.add(new_teacher)
            count += 1
            
        db.commit()
        # Audit log
        log = AuditLog(actorUsername="admin", actorRole="admin", action="BULK_REGISTER_FACULTY",
                       details=f"Imported {count} faculty, skipped {skipped} duplicates")
        db.add(log)
        db.commit()
        return {"message": f"Successfully imported {count} faculty. Skipped {skipped} existing records."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process file: {str(e)}")
    finally:
        db.close()



# ─────────────────────────────────────────────
# F-23: Intelligent Exam Variation Generator
# ─────────────────────────────────────────────
@app.post("/api/tests/generate-variations")
async def generate_exam_variations(request: VariationRequest):
    """
    F-23: Expand a base set of questions into a larger, diverse set using AI.
    """
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API not configured")
    
    try:
        model = build_gemini_model()

        # Construct the prompt based on user requirements for a single request
        prompt = f"""
        Expand the given base questions for the subject "{request.subject}" into a larger question bank in a SINGLE JSON output.
        Goal: Transform {len(request.base_questions)} questions into exactly {request.total_count} unique variations.
        
        RULES:
        1. Create variations of the input questions (rephrase, change numbers, conceptual variants).
        2. Output MUST be ONLY a JSON array within a root object called "questions". No markdown.
        3. Randomize all options (A, B, C, D) and ensure the correct_answer matches the NEW shuffled letter.
        
        INPUT:
        {json.dumps(request.base_questions, indent=2)}
        
        JSON STRUCTURE:
        {{ "questions": [ {{ "id": 1, "question": "...", "options": {{ "A": "..", "B": "..", "C": "..", "D": ".." }}, "correct_answer": "A" }} ] }}
        """
        
        response = model.generate_content(prompt)
        return json.loads(response.text)

    except Exception as e:
        logger.error(f"Variation Generation Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)
