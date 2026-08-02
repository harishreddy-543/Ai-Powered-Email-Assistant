import httpx
from typing import List, Dict, Optional, Any
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import models
from app.services.vector_service import vector_service
from app.services.ml_service import MLService

class LLMService:
    @staticmethod
    def _call_openai(prompt: str, system_prompt: str) -> Optional[str]:
        if not settings.OPENAI_API_KEY:
            return None
            
        try:
            # Synchronous call using httpx to prevent blocking
            headers = {
                "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.5,
                "max_tokens": 500
            }
            response = httpx.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=15.0
            )
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"].strip()
            else:
                print(f"OpenAI API error: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"Failed to query OpenAI: {e}")
        return None

    @classmethod
    def extract_actionable_insights(cls, email_subject: str, email_body: str, received_at_iso: str) -> Optional[Dict[str, Any]]:
        """
        Extracts summary, action items, deadlines, and why it matters in a single JSON-structured pass.
        """
        system_prompt = (
            "You are an AI Email Assistant. You must analyze the provided email and return a strict JSON object with NO markdown formatting, NO markdown code blocks, just raw JSON.\n"
            "Format:\n"
            "{\n"
            "  \"summary\": \"A short 1-2 sentence summary of the email.\",\n"
            "  \"action_items\": [\"List of specific tasks the user needs to do\"],\n"
            "  \"deadlines\": [\n"
            "    {\"title\": \"Event name\", \"datetime\": \"ISO format datetime resolved relative to the email's received date\", \"confidence\": 0.9, \"source_text\": \"exact text\"}\n"
            "  ],\n"
            "  \"why_it_matters\": \"A short 1-sentence explanation of why this email is important to the user (e.g. 'Placement opportunity', 'Registration required').\"\n"
            "}\n"
            f"Note: Resolve any relative dates (like 'tomorrow', 'next week') relative to this email's received date: {received_at_iso}.\n"
            "If no action items or deadlines exist, return empty arrays."
        )
        
        prompt = f"Subject: {email_subject}\nBody:\n{email_body}"
        
        if not settings.OPENAI_API_KEY:
            # Fallback for no API key
            return {
                "summary": "No API key configured for summary.",
                "action_items": [],
                "deadlines": [],
                "why_it_matters": "Action extraction requires LLM API key."
            }
            
        try:
            headers = {
                "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.2,
                "response_format": { "type": "json_object" }
            }
            response = httpx.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=15.0
            )
            if response.status_code == 200:
                import json
                result = response.json()
                content = result["choices"][0]["message"]["content"].strip()
                return json.loads(content)
            else:
                print(f"OpenAI API error during extraction: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"Failed to query OpenAI for extraction: {e}")
            
        return {
            "summary": "Failed to generate intelligent summary.",
            "action_items": [],
            "deadlines": [],
            "why_it_matters": ""
        }

    @classmethod
    def generate_daily_digest(cls, stats: Dict[str, Any]) -> str:
        """
        Generate a readable markdown digest from structured statistics.
        """
        import json
        system_prompt = (
            "You are an AI Email Assistant writing a Daily AI Digest for the user. "
            "You will be given structured JSON statistics about the emails received in the last 24 hours. "
            "Your job is to format these statistics into a beautiful, readable Markdown report. "
            "Use emojis, bullet points, and sections like 🚨 SECURITY, 💼 JOBS & PLACEMENTS, 🎓 EDUCATION, ⏰ DEADLINES, 📌 ACTION REQUIRED, and 📢 LOW PRIORITY. "
            "Do not invent any numbers or facts that are not in the JSON. Keep it concise."
        )
        
        prompt = f"Here are the email statistics for the last 24 hours:\n{json.dumps(stats, indent=2)}\n\nPlease generate the Markdown digest."
        
        result = cls._call_openai(prompt, system_prompt)
        if result:
            return result
        return "Failed to generate digest. Please try again later."

    @classmethod
    def generate_summary(cls, email_subject: str, email_body: str, entities: List[Dict[str, str]], priority: str, bullet_count: int = 5) -> str:
        """
        Generate an email summary based strictly on important content without a fixed point limit.
        """
        
        system_prompt = (
            "You are an AI Email Assistant. Summarize the email into a concise list of accurate, important, and relevant bullet points.\n"
            "Analyze the email content and generate as many points as necessary to capture the critical information, but DO NOT repeat information.\n"
            "DO NOT output unnecessary raw text, long URLs, or tracking links.\n"
            "When constructing your bullets, consider including (if present in the email):\n"
            "- The primary objective or subject of the email\n"
            "- Critical deadlines, dates, or financial amounts\n"
            "- Specific action items required by the recipient\n"
            "- Key organizations or people mentioned\n"
            "- The overall priority and sentiment context\n"
            "IMPORTANT: Do not number them yourself, just output plain text lines separated by newlines."
        )
        
        prompt = f"Subject: {email_subject}\nPriority: {priority}\nBody:\n{email_body}"
        
        # 1. Try OpenAI
        openai_result = cls._call_openai(prompt, system_prompt)
        if openai_result:
            return openai_result
            
        # 2. Local/Offline Advanced Extractive Summarizer
        pool = []
        
        # 1. Keep the Objective as requested
        pool.append(f"Objective: {email_subject or 'General Inquiry'}")
        
        # 2. Extract and score sentences from body
        # Split by punctuation or newlines
        sentences = re.split(r"[.!?\n]\s+", email_body)
        action_indicators = ["please", "need to", "must", "review", "schedule", "verify", "update", "send", "submit", "tomorrow", "deadline", "action"]
        
        scored_sentences = []
        for sent in sentences:
            sent_clean = sent.strip()
            
            # Aggressive filtering for CSS, HTML, URLs, and bad lengths
            if len(sent_clean) < 15 or len(sent_clean) > 250:
                continue
            if "http" in sent_clean.lower() or "{" in sent_clean or "px" in sent_clean.lower() or "ttf" in sent_clean.lower():
                continue
                
            score = 0
            
            # Boost for action items
            if any(ind in sent_clean.lower() for ind in action_indicators):
                score += 3
                
            # Boost for containing extracted NER entities (Dates, Orgs, Money, etc.)
            for e in entities:
                val = str(e.get("entity_value", ""))
                if len(val) > 3 and val.lower() in sent_clean.lower():
                    score += 2
                    
            if score > 0:
                scored_sentences.append((score, sent_clean))
                
        # Sort sentences by highest score
        scored_sentences.sort(key=lambda x: x[0], reverse=True)
        
        # Pick top 3 to 4 unique, highly relevant sentences
        added_sents = set()
        for score, sent in scored_sentences:
            if sent not in added_sents:
                # Add capitalization if missing
                final_sent = sent[0].upper() + sent[1:] if sent else sent
                pool.append(final_sent)
                added_sents.add(sent)
            if len(pool) >= 4:
                break
                
        # Fallback if the email body is completely empty or useless
        if len(pool) == 1:
            pool.append("No critical action items or explicit details detected in the message body.")
            
        # Strip internal newlines from items so they don't break the frontend bullet rendering
        return "\n".join([f"• {item.replace(chr(10), ' ').replace(chr(13), '')}" for item in pool])

    @staticmethod
    def generate_smart_reply(db: Session, email, entities, pref, length_preference="Concise"):
        """
        Generate a contextual smart reply based on email content, thread, and user preferences.
        Returns a dictionary with advanced tracking fields.
        """
        import json
        style = pref.writing_style if pref else "Professional"
        
        # 0. Reply Needed Classifier & Security Guardrails
        is_reply_recommended = True
        recommendation_reason = "Sender requested a response or action."
        
        category = email.category
        subject_topic = email.subject.replace("Re:", "").replace("Fwd:", "").strip() if email.subject else "your recent message"
        body_clean = email.body.strip() if email.body else ""
        word_count = len(body_clean.split())
        has_question = "?" in body_clean
        
        # Security Guardrails
        if email.is_phishing or getattr(email, "final_verdict", None) == "Phishing":
            is_reply_recommended = False
            recommendation_reason = "This email has been classified as High Risk / Phishing. Replying is disabled."
            return {
                "is_reply_recommended": False,
                "recommendation_reason": recommendation_reason,
                "generated_body": "Replying to this message is disabled because the email has been classified as high-risk phishing.",
                "ai_explanation": "Security engine returned Phishing verdict."
            }
            
        # Classifier
        if category in ["Promotion", "Promotional", "Newsletter", "Newsletters", "Updates"]:
            is_reply_recommended = False
            recommendation_reason = "This is an automated promotional or newsletter email and does not require a response."
        elif "otp" in body_clean.lower() or "verification code" in body_clean.lower() or "do not reply" in body_clean.lower():
            is_reply_recommended = False
            recommendation_reason = "This appears to be an automated system notification (e.g., OTP) that does not accept replies."
        
        # 1. Retrieve similar past emails (RAG)
        similar_context = ""
        similar_emails = []
        try:
            similar_results = vector_service.search_similar(email.body or email.subject, limit=2)
            for email_id, score in similar_results:
                if email_id == email.id:
                    continue  # Skip current email
                past_email = db.query(models.Email).filter(models.Email.id == email_id).first()
                if past_email and past_email.replies:
                    sent_replies = [r.generated_body for r in past_email.replies if r.status in ["Sent", "Suggested"]]
                    if sent_replies:
                        similar_emails.append(f"Past Email: {past_email.body[:150]}...\nOur Past Reply: {sent_replies[0]}")
            
            if similar_emails:
                similar_context = "\n--- Historical Reference Conversations ---\n" + "\n\n".join(similar_emails)
        except Exception as e:
            pass

        # 2. Extract context
        extracted_info = ", ".join([f"{e['entity_type']}: {e['entity_value']}" for e in entities])
        
        # Build explanation
        ai_explanation = {
            "intent": "Information/Action" if not has_question else "Questions Detected",
            "questions_detected": 1 if has_question else 0,
            "context_used": len(similar_emails),
            "tone": style,
            "length": length_preference
        }

        # 3. Try LLM Call (if enabled)
        openai_reply = None
        if settings.OPENAI_API_KEY:
            prompt = (
                f"Draft a highly professional, realistic email reply to the following message. "
                f"Do not invent facts (like availability, payment status, etc). If uncertain, write a placeholder or say you will confirm shortly.\n\n"
                f"Sender: {email.sender}\n"
                f"Subject: {email.subject}\n"
                f"Message:\n{email.body}\n\n"
                f"Extracted Entities: {extracted_info}\n"
                f"{similar_context}\n\n"
                f"Style/Tone: {style}\n"
                f"Length: {length_preference} (If Concise, keep it very short. If Detailed, explain thoroughly.)\n"
                f"Return ONLY the plain text reply."
            )
            openai_reply = LLMService._call_openai(prompt)
            
        if openai_reply:
            return {
                "is_reply_recommended": is_reply_recommended,
                "recommendation_reason": recommendation_reason,
                "generated_body": openai_reply,
                "ai_explanation": json.dumps(ai_explanation)
            }

        # 4. Local/Offline Contextual Advanced Professional Heuristic Reply
        sender_name = email.sender.split("<")[0].replace('"', '').strip()
        if "@" in sender_name:
            sender_name = sender_name.split("@")[0].title()
            
        dates = [e["entity_value"] for e in entities if e["entity_type"] == "DATE"]
        date_str = dates[0] if dates else "the upcoming week"
        
        # Determine Salutation and Signoff
        if style == "Friendly":
            salutation = f"Hi {sender_name},"
            signoff = "Best regards,\nAI Assistant"
        elif style == "Direct":
            salutation = f"Hello {sender_name},"
            signoff = "Regards,\nAI Assistant"
        elif style == "Formal":
            salutation = f"Dear {sender_name},"
            signoff = "Yours sincerely,\nAI Assistant"
        else: # Professional
            salutation = f"Dear {sender_name},"
            signoff = "Sincerely,\nAI Assistant"

        # Generate realistic contextual response
        sentences = []
        
        # Factual Guardrails
        if "meeting" in body_clean.lower() or "schedule" in body_clean.lower() or "call" in body_clean.lower():
            # GUARDRAIL: Do not invent availability
            ai_explanation["intent"] = "Meeting Request"
            sentences.append(f"Thank you for reaching out to discuss {subject_topic}.")
            sentences.append(f"I will need to check my calendar for {date_str} to confirm my availability.")
            
            if length_preference == "Detailed":
                sentences.append("I want to ensure we have sufficient time blocked off to cover all the necessary points comprehensively.")
                sentences.append("Once I review my upcoming schedule, I will propose a few options that might work.")
                
            sentences.append("I'll get back to you shortly with a confirmation or alternative times.")
        
        elif "invoice" in body_clean.lower() or "payment" in body_clean.lower() or "billing" in body_clean.lower():
            # GUARDRAIL: Acknowledge receipt, don't invent ledger status
            ai_explanation["intent"] = "Billing/Payment"
            sentences.append(f"Thank you for sending the information regarding {subject_topic}.")
            sentences.append("I have forwarded this to the appropriate department for review.")
            
            if length_preference == "Detailed":
                sentences.append("We take these matters seriously and typically process such documentation within standard business cycles.")
                sentences.append("If there are any discrepancies or if further information is required, we will reach out.")
                
            sentences.append("We will update you as soon as the review is complete.")
        elif has_question:
            ai_explanation["intent"] = "Question/Inquiry"
            sentences.append(f"Thank you for your questions regarding {subject_topic}.")
            
            if style == "Direct":
                sentences.append("I am reviewing the information and will provide a comprehensive answer by tomorrow.")
            else:
                sentences.append("I am currently reviewing the information you provided to ensure I give you a comprehensive and accurate answer.")
                sentences.append("You can expect a detailed response from me by tomorrow.")
                
            if length_preference == "Detailed":
                sentences.append("Please feel free to send over any additional context in the meantime.")
                sentences.append("Given the extensive and detailed nature of the information you provided, I want to make sure we review everything thoroughly before proceeding.")
                sentences.append("We appreciate the thoroughness of your communication.")
                
        else:
            ai_explanation["intent"] = "General Correspondence"
            sentences.append(f"Thank you for the update and sharing the details regarding {subject_topic}.")
            
            if style == "Direct":
                sentences.append("I have noted the information.")
            else:
                sentences.append("I have documented the information and shared it with the relevant stakeholders on our team.")
                
            if length_preference == "Detailed":
                sentences.append("It's always helpful to have this kind of thorough documentation on record.")
                sentences.append("If there are any further updates or changes to the situation, please don't hesitate to reach out and let us know.")
                
            sentences.append("I appreciate the communication and will keep you updated as things progress.")
            
        body = " ".join(sentences)

        # Merge pieces
        final_reply = f"{salutation}\n\n{body}\n\n{signoff}"
        
        return {
            "is_reply_recommended": is_reply_recommended,
            "recommendation_reason": recommendation_reason,
            "generated_body": final_reply,
            "ai_explanation": json.dumps(ai_explanation)
        }

import re
