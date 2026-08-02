import re

with open('app/api/emails.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure SessionLocal is imported
if 'from app.db.session import SessionLocal' not in content:
    content = content.replace('from app.db.database import get_db', 'from app.db.database import get_db\nfrom app.db.session import SessionLocal')
    # Or if get_db is imported from session:
    content = content.replace('from app.api import deps', 'from app.api import deps\nfrom app.db.session import SessionLocal')

# Replace the sync background task logic
old_logic = '''@router.post("/fetch/sync")
def trigger_real_email_sync(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
) -> Any:
    """
    Trigger a real email check via IMAP in the background.
    """
    background_tasks.add_task(sync_real_emails, db, current_user.id)
    return {"message": "Sync started in background"}'''

new_logic = '''def background_sync_task(user_id: int):
    from app.db.session import SessionLocal
    db = SessionLocal()
    try:
        sync_real_emails(db, user_id)
    finally:
        db.close()

@router.post("/fetch/sync")
def trigger_real_email_sync(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
) -> Any:
    """
    Trigger a real email check via IMAP in the background.
    """
    background_tasks.add_task(background_sync_task, current_user.id)
    return {"message": "Sync started in background"}'''

if old_logic in content:
    content = content.replace(old_logic, new_logic)
else:
    # try regex replacement
    regex = r'@router\.post\("/fetch/sync"\)\s*def trigger_real_email_sync.*?return \{"message": "Sync started in background"\}'
    content = re.sub(regex, new_logic, content, flags=re.DOTALL)

with open('app/api/emails.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated background task logic!")
