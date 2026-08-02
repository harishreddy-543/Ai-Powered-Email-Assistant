from pydantic import BaseModel, EmailStr, ConfigDict
from typing import List, Optional
from datetime import datetime

# --- Token & Authentication ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- Preferences Schemas ---
class PreferencesBase(BaseModel):
    writing_style: str = "Professional"
    auto_reply_enabled: bool = False
    summary_bullet_count: int = 5
    alert_keywords: Optional[str] = None
    alert_categories: Optional[str] = None
    digest_enabled: bool = True

class PreferencesUpdate(PreferencesBase):
    pass

class PreferencesResponse(PreferencesBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

# --- Entity Schemas ---
class EntityResponse(BaseModel):
    id: int
    email_id: int
    entity_type: str
    entity_value: str

    class Config:
        from_attributes = True

# --- Reply Schemas ---
class ReplyBase(BaseModel):
    generated_body: str
    status: str = "Suggested"

class ReplyCreate(ReplyBase):
    email_id: int

class ReplyStatusUpdate(BaseModel):
    status: str  # Suggested, Sent, Rejected, Edited
    edited_body: Optional[str] = None
    tone: Optional[str] = None
    length_preference: Optional[str] = None

class ReplyResponse(ReplyBase):
    id: int
    email_id: int
    created_at: datetime
    
    tone: Optional[str] = None
    length_preference: Optional[str] = None
    is_reply_recommended: bool = True
    recommendation_reason: Optional[str] = None
    edited_text: Optional[str] = None
    approved_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    provider_message_id: Optional[str] = None
    model_version: Optional[str] = None
    ai_explanation: Optional[str] = None

    class Config:
        from_attributes = True

# --- Feedback Schemas ---
class FeedbackCreate(BaseModel):
    email_id: int
    feedback_type: str  # category_correction, spam_correction, response_rating
    corrected_value: str

class FeedbackResponse(FeedbackCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Email Schemas ---
class EmailBase(BaseModel):
    sender: str
    recipient: str
    subject: Optional[str] = None
    body: Optional[str] = None
    
    # Intelligence & Alerts
    summary: Optional[str] = None
    action_items: Optional[str] = None
    deadlines: Optional[str] = None
    why_it_matters: Optional[str] = None
    needs_alert: bool = False

class EmailResponse(EmailBase):
    id: int
    user_id: int
    thread_id: Optional[str] = None
    message_id: Optional[str] = None
    received_at: datetime
    is_read: bool
    
    category: str
    priority: str
    sentiment: str
    spam_score: float
    phishing_score: float
    is_spam: bool
    is_phishing: bool
    is_simulated: bool = False
    
    # Security Engine Signals
    spf_status: Optional[str] = None
    dkim_status: Optional[str] = None
    dmarc_status: Optional[str] = None
    domain_impersonation: bool = False
    phishing_reasons: Optional[str] = None
    trust_score: float = 0.0
    final_verdict: str = "Safe"
    
    entities: List[EntityResponse] = []
    replies: List[ReplyResponse] = []

    model_config = ConfigDict(from_attributes=True)

# --- Alert Schemas ---
class AlertBase(BaseModel):
    alert_type: str
    severity: str = "Medium"
    title: str
    message: str
    trigger_reason: Optional[str] = None
    is_read: bool = False
    delivery_status: str = "In-App"

class AlertCreate(AlertBase):
    email_id: int
    user_id: int

class AlertResponse(AlertBase):
    id: int
    email_id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class EmailUpdate(BaseModel):
    is_read: Optional[bool] = None
    category: Optional[str] = None
    priority: Optional[str] = None

# --- Search Schemas ---
class SearchResult(BaseModel):
    email: EmailResponse
    similarity_score: float

class SummaryRequest(BaseModel):
    bullet_count: int = 5


class SearchQuery(BaseModel):
    query: str
    limit: int = 10

# --- Analytics Schemas ---
class CategoryCount(BaseModel):
    category: str
    count: int

class PriorityCount(BaseModel):
    priority: str
    count: int

class DailyEmailVolume(BaseModel):
    date: str
    count: int

class PhishingSpamStats(BaseModel):
    total_emails: int
    spam_count: int
    phishing_count: int
    clean_count: int

class AnalyticsResponse(BaseModel):
    category_distribution: List[CategoryCount]
    priority_distribution: List[PriorityCount]
    daily_volume: List[DailyEmailVolume]
    security_stats: PhishingSpamStats
