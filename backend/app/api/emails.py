from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Any, Dict
import datetime

from app.api import deps
from app.db.session import SessionLocal
from app.db.session import get_db
from app.models import models
from app.schemas import schemas
from app.services.agent_service import AgentService
from app.services.llm_service import LLMService
import difflib
from app.services.email_fetcher import simulate_incoming_email, sync_real_emails
from app.services.vector_service import vector_service

router = APIRouter()

@router.get("/", response_model=List[schemas.EmailResponse])
def read_emails(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user),
    skip: int = 0,
    limit: int = 50,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    is_spam: Optional[bool] = None,
    is_phishing: Optional[bool] = None
) -> Any:
    """
    Retrieve emails for the authenticated user with optional filters.
    """
    query = db.query(models.Email).filter(models.Email.user_id == current_user.id)
    
    if category:
        query = query.filter(models.Email.category == category)
    if priority:
        query = query.filter(models.Email.priority == priority)
    if is_spam is not None:
        query = query.filter(models.Email.is_spam == is_spam)
    if is_phishing is not None:
        query = query.filter(models.Email.is_phishing == is_phishing)
        
    emails = query.order_by(models.Email.received_at.desc()).offset(skip).limit(limit).all()
    return emails

@router.get("/alerts", response_model=List[schemas.AlertResponse])
def get_alerts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user),
    limit: int = 20,
    unread_only: bool = False
) -> Any:
    """
    Get mobile/push alerts for the user.
    """
    query = db.query(models.Alert).filter(models.Alert.user_id == current_user.id)
    if unread_only:
        query = query.filter(models.Alert.is_read == False)
    return query.order_by(models.Alert.created_at.desc()).limit(limit).all()

@router.post("/alerts/{alert_id}/read")
def mark_alert_read(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
) -> Any:
    """
    Mark an alert as read.
    """
    alert = db.query(models.Alert).filter(
        models.Alert.id == alert_id,
        models.Alert.user_id == current_user.id
    ).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_read = True
    db.commit()
    return {"status": "success"}

@router.get("/digest", response_model=Dict[str, str])
def get_daily_digest(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
) -> Any:
    """
    Generate the Daily AI Digest based on emails from the last 24 hours.
    """
    import datetime
    from app.services.llm_service import LLMService
    
    yesterday = datetime.datetime.utcnow() - datetime.timedelta(days=1)
    emails = db.query(models.Email).filter(
        models.Email.user_id == current_user.id,
        models.Email.received_at >= yesterday
    ).all()
    
    stats = {
        "total_received": len(emails),
        "security": {
            "suspicious": sum(1 for e in emails if e.final_verdict == "Suspicious"),
            "phishing": sum(1 for e in emails if e.is_phishing)
        },
        "jobs_and_placements": sum(1 for e in emails if e.category == "Education & Career" and "placement" in (e.subject or "").lower()),
        "education_updates": sum(1 for e in emails if e.category == "Education & Career" and "placement" not in (e.subject or "").lower()),
        "action_required": sum(1 for e in emails if e.needs_alert),
        "low_priority_ignored": sum(1 for e in emails if e.priority == "Low"),
        "deadlines_detected": 0
    }
    
    # Count deadlines
    import json
    for e in emails:
        if e.deadlines:
            try:
                dl = json.loads(e.deadlines)
                stats["deadlines_detected"] += len(dl)
            except:
                pass
                
    digest_md = LLMService.generate_daily_digest(stats)
    return {"digest": digest_md}

@router.get("/agent/logs", response_model=List[Dict[str, Any]])
def read_agent_logs(
    current_user: models.User = Depends(deps.get_current_user)
) -> Any:
    """
    Retrieve the AI agent's execution logs.
    """
    return AgentService.get_logs()

@router.post("/fetch/simulate", response_model=schemas.EmailResponse)
def trigger_simulate_email(
    type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
) -> Any:
    """
    Simulate an incoming email and process it through the AI agent pipeline.
    """
    simulated = simulate_incoming_email(db, current_user.id, sim_type=type or "random")
    db_email = db.query(models.Email).filter(models.Email.id == simulated["id"]).first()
    return db_email

@router.post("/fetch/simulate/clear")
def clear_simulated_emails(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
) -> Any:
    """
    Clear all simulated emails.
    """
    # Delete old simulated emails
    db.query(models.Email).filter(
        models.Email.user_id == current_user.id,
        models.Email.is_simulated == True
    ).delete(synchronize_session=False)
    db.commit()
    
    return {"message": "Simulated emails cleared successfully"}

def background_sync_task(user_id: int):
    from app.services.agent_service import SYNC_ACTIVE
    if user_id in SYNC_ACTIVE:
        return
    SYNC_ACTIVE.add(user_id)
    
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
        SYNC_ACTIVE.discard(user_id)
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
    from app.services.agent_service import SYNC_HEARTBEATS, SYNC_ACTIVE
    import time
    
    # Update heartbeat
    SYNC_HEARTBEATS[current_user.id] = time.time()
    
    if not current_user.google_access_token and not (current_user.imap_server and 
current_user.imap_password_encrypted):
        raise HTTPException(
            status_code=400, 
            detail="No email credentials found. Please sign out and reconnect your email (Gmail App Password or IMAP) to sync real emails."
        )
        
    if current_user.id not in SYNC_ACTIVE:
        background_tasks.add_task(background_sync_task, current_user.id)
        
    return {"message": "Sync heartbeat received and task started"}

@router.post("/fetch/sync/stop")
def stop_real_email_sync(current_user: models.User = Depends(deps.get_current_user)):
    from app.services.agent_service import SYNC_HEARTBEATS
    SYNC_HEARTBEATS[current_user.id] = 0
    return {"message": "Sync stopped forcefully"}

@router.get("/{email_id}", response_model=schemas.EmailResponse)
def read_email(
    email_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
) -> Any:
    """
    Get email by ID.
    """
    email = db.query(models.Email).filter(
        models.Email.id == email_id, 
        models.Email.user_id == current_user.id
    ).first()
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    return email

@router.put("/{email_id}", response_model=schemas.EmailResponse)
def update_email(
    email_id: int,
    email_in: schemas.EmailUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
) -> Any:
    """
    Update email status, category, or priority.
    """
    email = db.query(models.Email).filter(
        models.Email.id == email_id, 
        models.Email.user_id == current_user.id
    ).first()
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
        
    update_data = email_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(email, field, value)
        
    db.commit()
    db.refresh(email)
    return email

@router.post("/search", response_model=List[schemas.SearchResult])
def search_emails(
    query_in: schemas.SearchQuery,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
) -> Any:
    """
    Execute Hybrid Search: combining SQL database keyword matches and vector DB similarity scores.
    """
    # 1. Fetch semantic matches from vector database
    vector_results = vector_service.search_similar(query_in.query, limit=query_in.limit)
    vector_dict = {email_id: score for email_id, score in vector_results}
    
    # 2. Fetch keyword matches from SQL
    keyword_pattern = f"%{query_in.query}%"
    keyword_emails = db.query(models.Email.id, models.Email.subject, models.Email.sender).filter(
        models.Email.user_id == current_user.id,
        (models.Email.subject.ilike(keyword_pattern)) | 
        (models.Email.body.ilike(keyword_pattern)) |
        (models.Email.sender.ilike(keyword_pattern))
    ).limit(query_in.limit).all()
    
    # 3. Combine IDs (Hybrid approach: Union with weighted scores)
    combined_scores = {}
    
    # Semantic matches act as fallback (scaled down)
    for email_id, sim_score in vector_dict.items():
        combined_scores[email_id] = sim_score * 0.4
        
    # Exact text matches
    query_lower_exact = query_in.query.lower()
    for email_id, subj, sender in keyword_emails:
        subj_lower = subj.lower() if subj else ""
        sender_lower = sender.lower() if sender else ""
        
        if query_lower_exact in subj_lower or query_lower_exact in sender_lower:
            combined_scores[email_id] = 1.0  
        else:
            combined_scores[email_id] = max(combined_scores.get(email_id, 0), 0.6)
        
    # --- Fuzzy matching for misspelled queries ---
    recent_emails = db.query(models.Email.id, models.Email.subject, models.Email.sender).filter(
        models.Email.user_id == current_user.id
    ).order_by(models.Email.received_at.desc()).limit(1000).all()
    
    import re
    query_words = set(re.findall(r'\w+', query_in.query.lower()))
    
    for email_id, subj, sender in recent_emails:
        # Skip if already exact match
        if email_id in combined_scores and combined_scores[email_id] == 1.0:
            continue
            
        subj_lower = subj.lower() if subj else ""
        sender_lower = sender.lower() if sender else ""
        text_words = set(re.findall(r'\w+', subj_lower + " " + sender_lower))
        
        # Check fuzzy on individual words
        for qw in query_words:
            if difflib.get_close_matches(qw, text_words, n=1, cutoff=0.75):
                combined_scores[email_id] = max(combined_scores.get(email_id, 0), 0.8)
                break

    # Sort combined results
    sorted_items = sorted(combined_scores.items(), key=lambda x: x[1], reverse=True)[:query_in.limit]
    
    # Fetch final items
    results = []
    for email_id, score in sorted_items:
        email = db.query(models.Email).filter(models.Email.id == email_id).first()
        if email:
            results.append(schemas.SearchResult(email=schemas.EmailResponse.model_validate(email), similarity_score=score))
            
    return results

@router.post("/feedback", response_model=schemas.FeedbackResponse)
def submit_feedback(
    feedback_in: schemas.FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
) -> Any:
    """
    Submit user corrections. Updates email state and records user adjustments to feedback tables.
    """
    email = db.query(models.Email).filter(
        models.Email.id == feedback_in.email_id, 
        models.Email.user_id == current_user.id
    ).first()
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
        
    db_feedback = models.Feedback(
        email_id=feedback_in.email_id,
        feedback_type=feedback_in.feedback_type,
        corrected_value=feedback_in.corrected_value
    )
    db.add(db_feedback)
    
    # Apply changes to the email row immediately
    if feedback_in.feedback_type == "category_correction":
        email.category = feedback_in.corrected_value
        if feedback_in.corrected_value == "Spam":
            email.is_spam = True
            email.priority = "Low"
        else:
            email.is_spam = False
            
    elif feedback_in.feedback_type == "spam_correction":
        is_spam_val = feedback_in.corrected_value.lower() == "true"
        email.is_spam = is_spam_val
        if is_spam_val:
            email.category = "Spam"
            email.priority = "Low"
        else:
            email.category = "Work" # reset fallback
            
    db.commit()
    db.refresh(db_feedback)
    return db_feedback

@router.post("/reply/{reply_id}/regenerate", response_model=schemas.ReplyResponse)
def regenerate_reply(
    reply_id: int,
    reply_in: schemas.ReplyStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
) -> Any:
    """
    Regenerate a smart reply with a new tone and length.
    """
    import json
    reply = db.query(models.Reply).join(models.Email).filter(
        models.Reply.id == reply_id,
        models.Email.user_id == current_user.id
    ).first()
    if not reply:
        raise HTTPException(status_code=404, detail="Suggested reply not found")
        
    email_record = reply.email
    entities_dict = []
    if email_record.entities:
        try:
            entities_dict = json.loads(email_record.entities)
        except:
            if isinstance(email_record.entities, list):
                entities_dict = [{'entity_type': getattr(e, 'entity_type', ''), 'entity_value': getattr(e, 'entity_value', '')} for e in email_record.entities]
            elif isinstance(email_record.entities, str):
                entities_dict = json.loads(email_record.entities)
                
    pref = db.query(models.Preferences).filter(models.Preferences.user_id == current_user.id).first()
    if pref:
        if reply_in.tone:
            pref.writing_style = reply_in.tone
            
    length_pref = reply_in.length_preference or reply.length_preference or "Concise"
    reply_dict = LLMService.generate_smart_reply(db, email_record, entities_dict, pref, length_preference=length_pref)
    reply.generated_body = reply_dict.get("generated_body", "")
    reply.tone = reply_in.tone or (pref.writing_style if pref else "Professional")
    reply.length_preference = reply_in.length_preference or "Concise"
    reply.ai_explanation = reply_dict.get("ai_explanation")
    reply.status = "Suggested"
    
    db.commit()
    db.refresh(reply)
    return reply

@router.put("/reply/{reply_id}", response_model=schemas.ReplyResponse)
def update_reply(
    reply_id: int,
    reply_in: schemas.ReplyStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
) -> Any:
    """
    Approve, reject, or edit a suggested smart response.
    If approved (Sent), actually dispatch the email via SMTP/Gmail API.
    """
    reply = db.query(models.Reply).join(models.Email).filter(
        models.Reply.id == reply_id,
        models.Email.user_id == current_user.id
    ).first()
    if not reply:
        raise HTTPException(status_code=404, detail="Suggested reply not found")
        
    reply.status = reply_in.status
    if reply_in.edited_body:
        reply.generated_body = reply_in.edited_body
    if reply_in.tone:
        reply.tone = reply_in.tone
    if reply_in.length_preference:
        reply.length_preference = reply_in.length_preference
        
    # If the user clicks Save & Send, actually send the email!
    if reply.status == "Sent":
        import smtplib
        import base64
        import datetime
        from email.mime.text import MIMEText
        from app.core import security
        from app.services.agent_service import log_agent_activity
        
        email_record = reply.email
        
        # We reply to the original sender
        sender_email = email_record.sender.split("<")[-1].replace(">", "").strip()
        
        msg = MIMEText(reply.generated_body)
        msg['Subject'] = f"Re: {email_record.subject}" if email_record.subject else "Re: Your message"
        msg['From'] = current_user.email
        msg['To'] = sender_email
        
        # Add thread references if available
        if email_record.message_id:
            msg['In-Reply-To'] = email_record.message_id
            msg['References'] = email_record.message_id
        
        reply.sent_at = datetime.datetime.utcnow()
        reply.approved_at = datetime.datetime.utcnow()
        
        # Try to send via Gmail API or SMTP
        email_sent = False
        api_error_message = None
        
        # 1. Prefer Gmail API
        if current_user.google_access_token:
            try:
                import requests
                
                raw_msg = base64.urlsafe_b64encode(msg.as_bytes()).decode('utf-8')
                body_payload = {'raw': raw_msg}
                if email_record.thread_id and not email_record.thread_id.startswith('thread_'):
                    body_payload['threadId'] = email_record.thread_id
                    
                headers = {
                    'Authorization': f'Bearer {current_user.google_access_token}',
                    'Content-Type': 'application/json'
                }
                
                resp = requests.post(
                    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
                    headers=headers,
                    json=body_payload
                )
                
                if resp.status_code == 200:
                    sent_message = resp.json()
                    reply.provider_message_id = sent_message.get('id')
                    email_sent = True
                    log_agent_activity("GMAIL_API_SEND", f"Successfully dispatched smart reply to {sender_email} via Gmail API REST")
                elif resp.status_code in [401, 403] and current_user.google_refresh_token:
                    # Token might be expired. Attempt to refresh it.
                    try:
                        from google.oauth2.credentials import Credentials
                        from google.auth.transport.requests import Request as GoogleAuthRequest
                        import os
                        
                        client_id = os.getenv("GOOGLE_CLIENT_ID", "")
                        client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "")
                        
                        if client_id and client_secret:
                            creds = Credentials(
                                token=current_user.google_access_token,
                                refresh_token=current_user.google_refresh_token,
                                token_uri="https://oauth2.googleapis.com/token",
                                client_id=client_id,
                                client_secret=client_secret
                            )
                            creds.refresh(GoogleAuthRequest())
                            
                            # Save new token to user
                            current_user.google_access_token = creds.token
                            db.commit()
                            
                            # Retry request
                            headers['Authorization'] = f'Bearer {current_user.google_access_token}'
                            retry_resp = requests.post(
                                'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
                                headers=headers,
                                json=body_payload
                            )
                            if retry_resp.status_code == 200:
                                sent_message = retry_resp.json()
                                reply.provider_message_id = sent_message.get('id')
                                email_sent = True
                                log_agent_activity("GMAIL_API_SEND", f"Successfully dispatched smart reply to {sender_email} after token refresh")
                            else:
                                api_error_message = f"Gmail API returned {retry_resp.status_code} after refresh"
                                log_agent_activity("GMAIL_API_ERROR", f"Retry failed: {retry_resp.text}")
                        else:
                            api_error_message = "Google authentication expired. Please log out and log in again."
                    except Exception as refresh_err:
                        api_error_message = "Failed to refresh Google token. Please log out and log in again."
                        log_agent_activity("GMAIL_API_ERROR", f"Token refresh failed: {str(refresh_err)}")
                elif resp.status_code in [401, 403]:
                    api_error_message = "Google authentication expired or missing 'Send' permission. Please log out and log in again, or provide an App Password in Settings."
                    print(f"Gmail API Auth Error: {resp.status_code} {resp.text}")
                    log_agent_activity("GMAIL_API_ERROR", f"Gmail API auth error {resp.status_code}: {resp.text}")
                else:
                    api_error_message = f"Gmail API returned {resp.status_code}"
                    print(f"Gmail API REST failed: {resp.status_code} {resp.text}")
                    log_agent_activity("GMAIL_API_ERROR", f"Gmail API returned {resp.status_code}: {resp.text}")
            except Exception as e:
                api_error_message = f"Gmail API error: {str(e)}"
                print(f"Failed to send email via Gmail API REST: {e}")
                log_agent_activity("GMAIL_API_ERROR", f"Exception during Gmail API REST call: {str(e)}")
                
        # 2. Fallback to SMTP
        if not email_sent and current_user.imap_server and current_user.imap_password_encrypted:
            try:
                smtp_server = current_user.imap_server.replace("imap.", "smtp.") if "imap." in current_user.imap_server else current_user.imap_server
                password = security.decrypt_imap_password(current_user.imap_password_encrypted)
                
                log_agent_activity("SMTP_SEND", f"Connecting to SMTP server {smtp_server} to send reply to {sender_email}")
                
                with smtplib.SMTP(smtp_server, 587) as server:
                    server.starttls()
                    server.login(current_user.imap_username, password)
                    server.send_message(msg)
                    
                email_sent = True
                log_agent_activity("SMTP_SUCCESS", f"Successfully dispatched smart reply to {sender_email}")
            except Exception as e:
                print(f"Failed to send email via SMTP: {e}")
                log_agent_activity("SMTP_ERROR", f"Failed to send email via SMTP: {str(e)}")
                
        if not email_sent:
            reply.status = "Suggested" # Revert status if completely failed
            detail_msg = api_error_message if api_error_message else "Failed to send email via both Gmail API and SMTP."
            raise HTTPException(status_code=400, detail=detail_msg)
    db.commit()
    db.refresh(reply)
    return reply

@router.get("/analytics/dashboard", response_model=schemas.AnalyticsResponse)
def get_dashboard_analytics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
) -> Any:
    """
    Compile productivity statistics, category shares, and security alerts for visualizations.
    """
    user_emails_query = db.query(models.Email).filter(
        models.Email.user_id == current_user.id,
        models.Email.is_simulated == False
    )
    
    # 1. Category Distribution
    categories = db.query(
        models.Email.category, func.count(models.Email.id)
    ).filter(
        models.Email.user_id == current_user.id,
        models.Email.is_simulated == False,
        models.Email.category.notin_(['Promotional', 'Spam', 'Phishing', 'Networking', 'Finance & Billing'])
    ).group_by(models.Email.category).all()
    cat_distribution = [schemas.CategoryCount(category=c[0], count=c[1]) for c in categories]
    
    # 2. Priority Distribution
    priorities = db.query(
        models.Email.priority, func.count(models.Email.id)
    ).filter(
        models.Email.user_id == current_user.id,
        models.Email.is_simulated == False
    ).group_by(models.Email.priority).all()
    prior_distribution = [schemas.PriorityCount(priority=p[0], count=p[1]) for p in priorities]
    
    # 3. Security Stats
    total = user_emails_query.count()
    spam = user_emails_query.filter(models.Email.is_spam == True).count()
    phishing = user_emails_query.filter(models.Email.is_phishing == True).count()
    clean = total - spam - phishing
    sec_stats = schemas.PhishingSpamStats(
        total_emails=total,
        spam_count=spam,
        phishing_count=phishing,
        clean_count=max(0, clean)
    )
    
    # 4. Daily Volume (for past 7 days)
    daily_volume = []
    for i in range(6, -1, -1):
        day = datetime.date.today() - datetime.timedelta(days=i)
        day_str = day.strftime("%Y-%m-%d")
        count = user_emails_query.filter(
            func.date(models.Email.received_at) == day
        ).count()
        daily_volume.append(schemas.DailyEmailVolume(date=day_str, count=count))
        
    return schemas.AnalyticsResponse(
        category_distribution=cat_distribution,
        priority_distribution=prior_distribution,
        daily_volume=daily_volume,
        security_stats=sec_stats
    )

@router.get("/user/preferences", response_model=schemas.PreferencesResponse)
def get_user_preferences(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
) -> Any:
    """
    Get user preferences.
    """
    pref = db.query(models.Preferences).filter(models.Preferences.user_id == current_user.id).first()
    if not pref:
        pref = models.Preferences(user_id=current_user.id)
        db.add(pref)
        db.commit()
        db.refresh(pref)
    return pref

@router.put("/user/preferences", response_model=schemas.PreferencesResponse)
def update_user_preferences(
    pref_in: schemas.PreferencesUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
) -> Any:
    """
    Update user preferences.
    """
    pref = db.query(models.Preferences).filter(models.Preferences.user_id == current_user.id).first()
    if not pref:
        pref = models.Preferences(user_id=current_user.id)
        db.add(pref)
        
    for field, value in pref_in.model_dump().items():
        setattr(pref, field, value)
        
    db.commit()
    db.refresh(pref)
    return pref

@router.post("/{email_id}/summary", response_model=schemas.EmailResponse)
def generate_dynamic_summary(
    email_id: int,
    req: schemas.SummaryRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
) -> Any:
    email = db.query(models.Email).filter(
        models.Email.id == email_id, 
        models.Email.user_id == current_user.id
    ).first()
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
        
    entities = db.query(models.Entity).filter(models.Entity.email_id == email.id).all()
    entities_dict = [{"entity_type": e.entity_type, "entity_value": e.entity_value} for e in entities]
    
    summary = LLMService.generate_summary(
        email.subject, 
        email.body, 
        entities_dict, 
        email.priority, 
        req.bullet_count
    )
    email.summary = summary
    db.commit()
    db.refresh(email)
    return email
