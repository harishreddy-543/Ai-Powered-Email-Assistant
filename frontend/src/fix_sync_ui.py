import re

with open('App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the polling effect completely
polling_effect_regex = r'  // Auto-sync polling\s*useEffect\(\(\) => \{.*?\}, \[isSyncing\]\);'
content = re.sub(polling_effect_regex, '', content, flags=re.DOTALL)

# Update the button onClick handler
old_button_regex = r'<button\s*onClick=\{\(\) => setIsSyncing\(!isSyncing\)\}.*?<RefreshCw className=\{w-3\.5 h-3\.5 \$\{isSyncing \? \'animate-spin\' : \'\'\}\} /> \{isSyncing \? \'Syncing\.\.\.\' : \'Sync Gmail\'\}\s*</button>'

new_button = '''<button 
            onClick={async () => {
              setIsSyncing(true);
              try {
                await fetch(${API_BASE}/emails/fetch/sync, { method: 'POST', headers: getHeaders() });
                // Briefly show syncing state, then poll for new emails
                setTimeout(() => {
                  setIsSyncing(false);
                  fetchEmails();
                }, 3000);
              } catch (e) {
                console.error(e);
                setIsSyncing(false);
              }
            }}
            disabled={isSyncing}
            className={px-3 py-1.5 rounded-full border text-[10px] font-bold flex items-center gap-1.5 transition-colors }>
            <RefreshCw className={w-3.5 h-3.5 } /> {isSyncing ? 'Syncing...' : 'Sync Gmail'}
          </button>'''

content = re.sub(old_button_regex, new_button, content, flags=re.DOTALL)

with open('App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("App.jsx Sync button fixed!")
