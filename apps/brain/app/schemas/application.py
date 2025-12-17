from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from enum import Enum
from app.core.constants import ApplicationStatus

class LoanProductCode(str, Enum):
    SBA_504 = 'sba_504'
    SBA_7A = 'sba_7a'
    CA_IBANK_GUARANTEE = 'ca_ibank_guarantee'
    INTERNAL_MICRO = 'internal_micro'
    COMMUNITY = 'community'

class DocumentRequirement(BaseModel):
    id: str
    name: str
    description: str
    status: str = 'pending' # pending, uploading, completed, failed
    uploaded: bool = False
    downloadUrl: Optional[str] = None
    fileName: Optional[str] = None
    uploadedAt: Optional[datetime] = None

class ApplicationBase(BaseModel):
    businessName: Optional[str] = None
    yearsInBusiness: Optional[int] = None
    annualRevenue: Optional[int] = None
    loanAmount: Optional[int] = None
    useOfFunds: Optional[str] = None
    type: Optional[LoanProductCode] = None
    
    # Contact Info
    contactName: Optional[str] = None
    contactEmail: Optional[str] = None
    contactPhone: Optional[str] = None
    
    # Address
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zipCode: Optional[str] = None
    venturesLoanId: Optional[str] = None
    venturesStatus: Optional[str] = None
    lastSyncedAt: Optional[datetime] = None
    lastUpdated: Optional[datetime] = None

class ApplicationCreate(ApplicationBase):
    type: LoanProductCode
    # userId is derived from Firebase auth; do not accept from client

class ApplicationUpdate(ApplicationBase):
    currentStep: Optional[int] = None
    documents: Optional[List[DocumentRequirement]] = None
    eligibilitySummary: Optional[str] = None
    status: Optional[ApplicationStatus] = None

class ApplicationResponse(ApplicationBase):
    id: str
    userId: str
    status: ApplicationStatus
    createdAt: datetime
    updatedAt: datetime
    lastUpdated: Optional[datetime] = None
    lastSyncedAt: Optional[datetime] = None
    currentStep: int
    documents: List[DocumentRequirement] = []
    eligibilitySummary: Optional[str] = None
    
    # Metadata
    submissionDate: Optional[datetime] = None
