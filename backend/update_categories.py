from app.db.session import SessionLocal
from app.models.models import Email

def update_categories():
    db = SessionLocal()
    emails = db.query(Email).all()
    
    for email in emails:
        sender = email.sender.lower()
        subject = email.subject.lower()
        body = email.body.lower()
        
        # Determine new category based on keywords
        if 'placement' in sender or 'placement' in subject or 'job' in sender or 'job' in subject or 'career' in subject or 'codegnan' in sender or 'fedex' in subject:
            new_cat = 'Education & Placements'
        elif 'finance' in sender or 'billing' in subject or 'invoice' in subject or 'payment' in subject or 'chase' in sender or 'paypal' in sender:
            new_cat = 'Finance & Billing'
        elif 'security' in subject or 'alert' in subject or 'google' in sender or 'urgent' in subject:
            new_cat = 'System Alerts'
        elif 'linkedin' in sender or 'network' in subject or 'connection' in subject or 'social' in email.category.lower():
            new_cat = 'Networking'
        elif 'newsletter' in subject or 'promotion' in email.category.lower() or 'deal' in subject or 'offer' in subject:
            new_cat = 'Newsletters'
        else:
            new_cat = 'Work & Projects'
            
        email.category = new_cat
        
    db.commit()
    print('Categories updated successfully.')

if __name__ == '__main__':
    update_categories()
