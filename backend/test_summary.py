import sys
import os
sys.path.append(os.getcwd())
from app.services.llm_service import LLMService

subject = 'Security alert'
body = 'You allowed Neural Inbox access to some data. Check activity. 2026, CA 94043'
entities = [{'entity_type': 'DATE', 'entity_value': '2026'}, {'entity_type': 'ORG', 'entity_value': 'Neural Inbox'}]
priority = 'Critical'

print('--- 3 BULLETS ---')
print(LLMService.generate_summary(subject, body, entities, priority, 3))

print('--- 7 BULLETS ---')
print(LLMService.generate_summary(subject, body, entities, priority, 7))
