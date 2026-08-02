import re

with open('app/services/email_fetcher.py', 'r', encoding='utf-8') as f:
    content = f.read()

if 'from dotenv import load_dotenv' not in content:
    content = content.replace('import os', 'import os\nfrom dotenv import load_dotenv\nload_dotenv()')

with open('app/services/email_fetcher.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("email_fetcher.py patched!")
