import datetime
from sqlalchemy.orm import Session
from typing import Dict, List, Any

from app.models import models
from app.services.ml_service import MLService
from app.services.vector_service import vector_service
from app.services.llm_service import LLMService
from app.services.security_service import SecurityEngine

# A global list to capture recent agent activities for the terminal dashboard
AGENT_LOGS: List[Dict[str, Any]] = []
SYNC_HEARTBEATS: Dict[int, float] = {}
SYNC_ACTIVE: set = set()

def log_agent_activity(action: str, detail: str, email_subject: str = ""):
    log_entry = {
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "action": action,
        "detail": detail,
        "subject": email_subject
    }
    AGENT_LOGS.append(log_entry)
    # Cap log size to 100 entries
    if len(AGENT_LOGS) > 100:
        AGENT_LOGS.pop(0)
    try:
        print(f"[AGENT LOG] {action} | {detail}")
    except UnicodeEncodeError:
        print(f"[AGENT LOG] {action} | {detail.encode('ascii', 'ignore').decode('ascii')}")

class AgentService:
    @staticmethod
    def get_logs() -> List[Dict[str, Any]]:
        return AGENT_LOGS

    @staticmethod
    def process_new_email(
        db: Session, 
        user_id: int, 
        sender: str, 
        recipient: str, 
        subject: str, 
        body: str,
        message_id: str = None,
        thread_id: str = None,
        received_at: datetime.datetime = None,
        raw_headers: List[Dict[str, str]] = None
    ) -> models.Email:
        """
        Runs the complete email processing workflow.
        """
        subj_log = subject or "No Subject"
        log_agent_activity("EMAIL_RECEIVED", f"New email from {sender}", subj_log)
        
        # 1. Spam Classification
        log_agent_activity("CLASSIFYING_SPAM", "Checking against spam heuristics and text vector classification", subj_log)
        spam_res = MLService.classify_spam(body)
        is_spam = spam_res["is_spam"]
        spam_score = spam_res["spam_score"]
        
        # Multi-Signal Security Engine (Feature Fusion)
        log_agent_activity("CLASSIFYING_SECURITY", "Analyzing authentication, domain, URLs, trust, and text for phishing signatures", subj_log)
        nlp_phishing_score = MLService.classify_phishing(body)["phishing_score"]
        
        auth_signals = SecurityEngine.analyze_authentication(raw_headers or [])
        domain_impersonation = SecurityEngine.analyze_domain(sender)
        url_signals = SecurityEngine.analyze_urls(body)
        trust_score = SecurityEngine.get_sender_trust(db, user_id, sender)
        
        security_verdict = SecurityEngine.compute_risk(
            nlp_phishing_score=nlp_phishing_score,
            nlp_spam_score=spam_score,
            auth=auth_signals,
            impersonation=domain_impersonation,
            urls=url_signals,
            trust_score=trust_score
        )
        
        is_phishing = security_verdict["final_verdict"] == "Phishing"
        phishing_score = security_verdict["final_risk_score"]
        
        # 2. General Categorization
        log_agent_activity("CLASSIFYING_CATEGORY", "Evaluating email text using XGBoost classifier", subj_log)
        if is_spam or is_phishing:
            category = "Spam"
        else:
            category = MLService.classify_category(body)
            subj_lower = subject.lower() if subject else ""
            sender_lower = sender.lower() if sender else ""
            
            # --- 1. SENDER DOMAIN PRIORITY (Strict Mapping) ---
            if any(d in sender_lower for d in ["linkedin", "unstop", "codegnan"]):
                category = "Education & Career"
            elif any(d in sender_lower for d in ["croma", "amazon", "flipkart", "myntra"]):
                category = "Shopping"
            elif any(d in sender_lower for d in ["paytm", "razorpay", "bank", "stripe", "paypal"]):
                category = "Payments"
            elif "google" in sender_lower:
                if any(w in subj_lower for w in ["security", "alert", "password", "sign-in", "login", "recover"]):
                    category = "Security & Account"
                else:
                    category = "Updates & Notifications"
                    
            # --- 2. SUBJECT-LEVEL PRIORITY (if sender didn't strongly match) ---
            elif any(w in subj_lower for w in ["security alert", "password", "sign-in", "otp", "verification", "login"]):
                category = "Security & Account"
            elif any(w in subj_lower for w in ["invoice", "payment", "transaction", "debited", "credited"]):
                category = "Payments"
            elif any(w in subj_lower for w in ["order", "shipped", "delivery"]):
                category = "Shopping"
                
            # --- 3. ML FALLBACK REMAPPING ---
            else:
                if category == "Finance & Payments":
                    category = "Payments"
                elif category == "Orders & Shopping":
                    category = "Shopping"
                elif category == "Action Required" or category == "Personal":
                    category = "Updates & Notifications"
            
        # 3. Priority and Sentiment Prediction
        log_agent_activity("PREDICTING_PRIORITY", "Calculating business priority and urgency indicators", subj_log)
        if is_phishing:
            priority = "Critical"
        elif is_spam:
            priority = "Low"
        else:
            priority = MLService.predict_priority(body)
            
        sentiment = MLService.analyze_sentiment(body)
        
        # 4. Create Email Record
        db_email_args = {
            "user_id": user_id,
            "sender": sender,
            "recipient": recipient,
            "subject": subject,
            "body": body,
            "message_id": message_id or f"msg_{int(datetime.datetime.utcnow().timestamp())}",
            "thread_id": thread_id or f"thread_{int(datetime.datetime.utcnow().timestamp())}",
            "is_read": False,
            "category": category,
            "priority": priority,
            "sentiment": sentiment,
            "spam_score": spam_score,
            "phishing_score": phishing_score,
            "is_spam": is_spam,
            "is_phishing": is_phishing,
            "spf_status": auth_signals.get("spf_status"),
            "dkim_status": auth_signals.get("dkim_status"),
            "dmarc_status": auth_signals.get("dmarc_status"),
            "domain_impersonation": domain_impersonation,
            "phishing_reasons": security_verdict["reasons"],
            "trust_score": trust_score,
            "final_verdict": security_verdict["final_verdict"]
        }
        if received_at:
            db_email_args["received_at"] = received_at
            
        db_email = models.Email(**db_email_args)
        db.add(db_email)
        db.commit()
        db.refresh(db_email)
        
        # 5. Extract NER Entities
        log_agent_activity("EXTRACTING_ENTITIES", "Running spaCy pipeline to extract named entities and dates", subj_log)
        entities_list = MLService.extract_entities(body)
        db_entities = []
        for ent in entities_list:
            db_ent = models.Entity(
                email_id=db_email.id,
                entity_type=ent["entity_type"],
                entity_value=ent["entity_value"]
            )
            db.add(db_ent)
            db_entities.append(db_ent)
        db.commit()
        
        # 6. Index in Vector Database
        log_agent_activity("INDEXING_VECTOR", f"Generating semantic embeddings and saving to local Vector DB index", subj_log)
        try:
            vector_service.index_email(db_email.id, subject, body)
        except Exception as e:
            log_agent_activity("INDEXING_ERROR", f"Failed vector storage sync: {str(e)}", subj_log)
            
        # 7. Fetch user preferences to guide LLM summarization and smart replies
        pref = db.query(models.Preferences).filter(models.Preferences.user_id == user_id).first()
        if not pref:
            pref = models.Preferences(user_id=user_id)
            db.add(pref)
            db.commit()
            db.refresh(pref)
            
        # 8. Run Extraction & Summarization
        log_agent_activity("LLM_EXTRACTION", "Extracting actionable insights, deadlines, and summary", subj_log)
        iso_time = (received_at or datetime.datetime.utcnow()).isoformat()
        insights = LLMService.extract_actionable_insights(subject, body, iso_time)
        import json
        if insights:
            db_email.summary = insights.get("summary", "")
            db_email.action_items = json.dumps(insights.get("action_items", []))
            db_email.deadlines = json.dumps(insights.get("deadlines", []))
            db_email.why_it_matters = insights.get("why_it_matters", "")
        db.commit()
        
        # 8b. Personalized Alert Decision Engine
        log_agent_activity("ALERT_DECISION", "Evaluating if email requires mobile notification", subj_log)
        needs_alert = False
        alert_reason = ""
        alert_type = "Watchlist"
        severity = "Medium"
        
        # Extract keywords and categories safely from JSON
        alert_keywords = []
        alert_categories = []
        if pref:
            try:
                alert_keywords = json.loads(pref.alert_keywords) if pref.alert_keywords else []
                alert_categories = json.loads(pref.alert_categories) if pref.alert_categories else []
            except Exception:
                pass
        
        # Determine Alert Need (User's rules)
        if is_phishing:
            needs_alert = True
            alert_reason = "High Security Risk / Phishing"
            alert_type = "Security"
            severity = "Critical"
        elif priority == "Critical":
            needs_alert = True
            alert_reason = "Critical Priority"
            alert_type = "Priority"
            severity = "Critical"
        else:
            # Check watchlist keywords
            body_subj_lower = (subject + " " + body).lower()
            keyword_match = next((kw for kw in alert_keywords if kw.lower() in body_subj_lower), None)
            
            # Check actionable state
            has_action_or_deadline = bool(insights and (insights.get("action_items") or insights.get("deadlines")))
            
            if keyword_match and has_action_or_deadline:
                needs_alert = True
                alert_reason = f"Watchlist match: {keyword_match}"
                alert_type = "Watchlist"
                severity = priority
            elif category in alert_categories and has_action_or_deadline:
                needs_alert = True
                alert_reason = f"Priority category: {category} with action required"
                alert_type = category
                severity = priority
            elif category in ["Education & Career", "Payments"] and has_action_or_deadline and priority in ["High", "Critical"]:
                needs_alert = True
                alert_reason = f"Important {category} deadline/action"
                alert_type = category
                severity = priority
        
        db_email.needs_alert = needs_alert
        if needs_alert:
            db_alert = models.Alert(
                user_id=user_id,
                email_id=db_email.id,
                alert_type=alert_type,
                severity=severity,
                title=f"{alert_type} Alert",
                message=db_email.summary or subject,
                trigger_reason=alert_reason
            )
            db.add(db_alert)
        db.commit()
        
        # 9. Generate suggested Smart Reply
        log_agent_activity("LLM_REPLY_GENERATION", f"Applying RAG context with style={pref.writing_style} to draft reply suggestion", subj_log)
        entities_dict = [{"entity_type": e.entity_type, "entity_value": e.entity_value} for e in db_entities]
        reply_dict = LLMService.generate_smart_reply(db, db_email, entities_dict, pref)
        db_reply = models.Reply(
            email_id=db_email.id,
            generated_body=reply_dict.get("generated_body", ""),
            status="Suggested",
            tone=pref.writing_style if pref else "Professional",
            is_reply_recommended=reply_dict.get("is_reply_recommended", True),
            recommendation_reason=reply_dict.get("recommendation_reason"),
            ai_explanation=reply_dict.get("ai_explanation")
        )
        db.add(db_reply)
        db.commit()
        
        log_agent_activity("AGENT_COMPLETE", f"Processing complete. Email classified as {category} with {priority} priority.", subj_log)
        
        db.refresh(db_email)
        return db_email
