from app.db.session import SessionLocal
from app.models.models import Email
from app.services.ml_service import MLService

def update_db():
    db = SessionLocal()
    emails = db.query(Email).all()
    
    for email in emails:
        text = email.body or email.subject
        # Re-evaluate spam
        spam_res = MLService.classify_spam(text)
        email.is_spam = spam_res['is_spam']
        email.spam_score = spam_res['spam_score']
        
        # Re-evaluate phishing
        phish_res = MLService.classify_phishing(text)
        email.is_phishing = phish_res['is_phishing']
        email.phishing_score = phish_res['phishing_score']
        
        # Re-evaluate category
        email.category = MLService.classify_category(text)
        
    db.commit()
    print('DB updated completely with new ML classifications.')

if __name__ == '__main__':
    update_db()
