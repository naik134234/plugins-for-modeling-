from datetime import datetime
from enum import Enum as PyEnum
import uuid
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, Float, ForeignKey, Integer, String, Text, 
    JSON, BigInteger
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql import func

Base = declarative_base()


class UserRole(str, PyEnum):
    """User roles for access control."""
    ADMIN = "admin"
    ANALYST = "analyst"
    VIEWER = "viewer"
    API_USER = "api_user"


class TaskStatus(str, PyEnum):
    """Status of async tasks."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ModelType(str, PyEnum):
    """Types of risk/financial models."""
    VAR_HISTORICAL = "var_historical"
    VAR_PARAMETRIC = "var_parametric"
    VAR_MONTE_CARLO = "var_monte_carlo"
    CREDIT_RISK = "credit_risk"
    MONTE_CARLO = "monte_carlo"
    SENSITIVITY = "sensitivity"
    STRESS_TEST = "stress_test"


class User(Base):
    """User model for authentication and authorization."""
    
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.ANALYST, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    risk_analyses = relationship("RiskAnalysis", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")


class RiskAnalysis(Base):
    """
    Represents a risk analysis request/job.
    Stores input parameters and points to results.
    """
    
    __tablename__ = "risk_analyses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    model_type = Column(Enum(ModelType), nullable=False, index=True)
    status = Column(Enum(TaskStatus), default=TaskStatus.PENDING, index=True)
    
    # Input parameters stored as JSON
    parameters = Column(JSONB, nullable=False)
    
    # Results stored as JSON (for smaller results) or reference to blob storage
    results = Column(JSONB, nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Timing
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    execution_time_ms = Column(Integer, nullable=True)
    
    # User ownership
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    user = relationship("User", back_populates="risk_analyses")
    
    # Simulations (one-to-many)
    simulations = relationship("SimulationRun", back_populates="analysis", cascade="all, delete-orphan")


class SimulationRun(Base):
    """
    Detailed results for Monte Carlo simulations.
    Used when results are too large for the main table.
    """
    
    __tablename__ = "simulation_runs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    analysis_id = Column(UUID(as_uuid=True), ForeignKey("risk_analyses.id"), nullable=False, index=True)
    
    iteration_number = Column(Integer, nullable=False)
    inputs = Column(JSONB, nullable=True)   # Specific inputs for this iteration
    outputs = Column(JSONB, nullable=False) # Results of this iteration
    
    analysis = relationship("RiskAnalysis", back_populates="simulations")


class AuditLog(Base):
    """Audit log for compliance and security."""
    
    __tablename__ = "audit_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    action = Column(String(255), nullable=False)
    resource_type = Column(String(100), nullable=False)
    resource_id = Column(String(255), nullable=True)
    details = Column(JSONB, nullable=True)
    ip_address = Column(String(45), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    user = relationship("User", back_populates="audit_logs")
