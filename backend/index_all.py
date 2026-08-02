from app.db.session import SessionLocal
from app.models.models import Email
from app.services.vector_service import vector_service

def index_all():
    db = SessionLocal()
    emails = db.query(Email).all()
    count = 0
    for email in emails:
        vector_service.index_email(email.id, email.subject, email.body)
        count += 1
    print(f'Successfully indexed {count} emails into the vector database.')

if __name__ == '__main__':
    index_all()
