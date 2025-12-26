from enum import Enum

class ApplicationStatus(str, Enum):
    DRAFT = "draft"
    QUICK_DRAFT = "quick_draft"
    SUBMITTED = "submitted"
    IN_REVIEW = "in_review"
    CONDITIONAL_APPROVAL = "conditional_approval"
    SBA_SUBMITTED = "sba_submitted"
    SBA_APPROVED = "sba_approved"
    CLOSING = "closing"
    FUNDED = "funded"
    DECLINED = "declined"
    WITHDRAWN = "withdrawn"

# Mock mapping of Ventures Status IDs/Names to App Statuses
# In reality, these keys would be the specific Status IDs from Ventures
VENTURES_STATUS_MAP = {
    "New Application": ApplicationStatus.SUBMITTED,
    "Intake Review": ApplicationStatus.IN_REVIEW,
    "Underwriting": ApplicationStatus.IN_REVIEW,
    "Committee Review": ApplicationStatus.IN_REVIEW,
    "Approved w/ Conditions": ApplicationStatus.CONDITIONAL_APPROVAL,
    "SBA Submission": ApplicationStatus.SBA_SUBMITTED,
    "SBA Approved": ApplicationStatus.SBA_APPROVED,
    "Closing": ApplicationStatus.CLOSING,
    "Funded": ApplicationStatus.FUNDED,
    "Declined": ApplicationStatus.DECLINED,
    "Withdrawn": ApplicationStatus.WITHDRAWN
}
