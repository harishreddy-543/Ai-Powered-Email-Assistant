import re

with open('app/api/emails.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add BackgroundTasks to imports
content = content.replace("from fastapi import APIRouter, Depends, HTTPException, Query, status", "from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks")

# 2. Update get_dashboard_analytics to filter out Spam and Phishing
old_filter = r"models\.Email\.category != 'Promotional'"
new_filter = "models.Email.category.notin_(['Promotional', 'Spam', 'Phishing', 'Networking', 'Finance & Billing'])"
content = re.sub(old_filter, new_filter, content)

# 3. Update trigger_real_email_sync to use BackgroundTasks
old_sync_func = r"@router\.post\(\"/fetch/sync\", response_model=List\[schemas\.EmailResponse\]\)\ndef trigger_real_email_sync\(\n    db: Session = Depends\(get_db\),\n    current_user: models\.User = Depends\(deps\.get_current_user\)\n\) -> Any:\n    \"\"\"\n    Trigger a real email check via IMAP\.\n    \"\"\"\n    before_count = db\.query\(models\.Email\)\.filter\(models\.Email\.user_id == current_user\.id\)\.count\(\)\n    sync_real_emails\(db, current_user\.id\)\n    after_emails = db\.query\(models\.Email\)\.filter\(\n        models\.Email\.user_id == current_user\.id\n    \)\.order_by\(models\.Email\.received_at\.desc\(\)\)\.limit\(10\)\.all\(\)\n    return after_emails"

new_sync_func = '''@router.post("/fetch/sync")
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

content = re.sub(old_sync_func, new_sync_func, content)

with open('app/api/emails.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated emails.py successfully!")
