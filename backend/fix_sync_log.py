import re

with open('app/api/emails.py', 'r', encoding='utf-8') as f:
    content = f.read()

old_logic = '''def background_sync_task(user_id: int):
    from app.db.session import SessionLocal
    db = SessionLocal()
    try:
        sync_real_emails(db, user_id)
    finally:
        db.close()'''

new_logic = '''def background_sync_task(user_id: int):
    from app.db.session import SessionLocal
    import traceback
    db = SessionLocal()
    try:
        print(f"Starting background sync for user {user_id}")
        sync_real_emails(db, user_id)
        print(f"Finished background sync for user {user_id}")
    except Exception as e:
        print(f"Background sync failed: {e}")
        traceback.print_exc()
    finally:
        db.close()'''

content = content.replace(old_logic, new_logic)

with open('app/api/emails.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated background task logging!")
