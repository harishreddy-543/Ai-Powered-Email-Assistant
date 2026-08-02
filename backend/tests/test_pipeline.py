import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.session import Base
from app.core import security
from app.services.ml_service import MLService
from app.services.vector_service import vector_service
from app.services.agent_service import AgentService
from app.models import models

# Use a local test SQLite in-memory engine for unit testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

def test_password_hashing():
    password = "mysecretpassword"
    hashed = security.get_password_hash(password)
    assert hashed != password
    assert security.verify_password(password, hashed)
    assert not security.verify_password("wrongpassword", hashed)

def test_jwt_generation():
    subject = "user@test.com"
    token = security.create_access_token(subject)
    assert token is not None
    assert isinstance(token, str)

def test_ml_fallbacks():
    # Test spam rule-based detector
    is_spam, score = MLService.classify_spam("CONGRATULATIONS! You have won a free iPhone. Click here to claim your cash.")
    assert is_spam is True
    assert score > 0.5
    
    # Test phishing rule-based detector
    is_phish, score = MLService.classify_phishing("URGENT: Suspicious transaction detected. Reset your password immediately by clicking this Netflix link.")
    assert is_phish is True
    assert score > 0.5
    
    # Test category fallback
    category = MLService.classify_category("Here is the agenda and spreadsheet for tomorrow's project kickoff meeting.")
    assert category == "Work"

def test_vector_similarity():
    # Test single embedding vector output
    query = "invoice payment details"
    embedding = vector_service.get_embedding(query)
    assert len(embedding) > 0
    
    # Index elements
    vector_service.index_email(1, "Billing Invoice July", "Attached is the server invoice of $100. Please process payment.")
    vector_service.index_email(2, "Soccer Saturday Plans", "Hey mate, do you want to play soccer this weekend?")
    
    # Test similarity sorting
    results = vector_service.search_similar("process bills and bank payment", limit=1)
    assert len(results) > 0
    assert results[0][0] == 1  # Invoice should rank highest
    
    # Clean up index
    vector_service.remove_email(1)
    vector_service.remove_email(2)

def test_agent_orchestrator(db_session):
    # Setup test user
    user = models.User(email="test@assistant.com", hashed_password="hashedpassword")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    # Run email through pipeline
    email = AgentService.process_new_email(
        db=db_session,
        user_id=user.id,
        sender="boss@corp.com",
        recipient="test@assistant.com",
        subject="Project sprint objectives and database sync",
        body="Dear colleague, we need to finalize the PostgreSQL schema before tomorrow's review meeting. Please inspect the models. Sincerely, Manager."
    )
    
    assert email.id is not None
    assert email.category == "Work"
    assert email.is_read is False
    assert email.summary is not None
    assert len(email.entities) > 0
    assert len(email.replies) > 0
