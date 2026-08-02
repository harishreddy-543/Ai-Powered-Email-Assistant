import re

with open('App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

polling_logic = """  // Auto-sync polling
  useEffect(() => {
    let interval;
    if (isSyncing) {
      interval = setInterval(() => {
        fetch(${API_BASE}/emails/fetch/sync, { method: 'POST', headers: getHeaders() })
          .then(() => fetchEmails())
          .catch(console.error);
      }, 15000);
    }
    return () => clearInterval(interval);
  }, [isSyncing]);
"""

effect_insertion = r"// Initial fetch"
content = content.replace(effect_insertion, polling_logic + "\n  " + effect_insertion)

with open('App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated App.jsx successfully! Part 3")
