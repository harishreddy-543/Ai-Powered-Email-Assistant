import re

with open('App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add sortCategory state
state_insertion = r"const \[selectedCategory, setSelectedCategory\] = useState\(null\);"
content = re.sub(state_insertion, state_insertion + "\n  const [sortCategory, setSortCategory] = useState('');", content)

# Add dropdown UI
filter_buttons_regex = r'(<button[^>]+onClick=\{\(\) => setSecurityFilter\(\'unread\'\)\}[^>]*>.*?<\/button>\s*<\/div>)'
dropdown_ui = """
                      <select 
                        value={sortCategory}
                        onChange={(e) => setSortCategory(e.target.value)}
                        className="ml-auto bg-zinc-800 text-white text-[11px] rounded-lg px-3 py-2 border border-zinc-700 outline-none cursor-pointer hover:bg-zinc-700 transition-colors"
                      >
                        <option value="">Sort by Category...</option>
                        {['Work & Projects', 'Education & Career', 'Finance & Payments', 'Orders & Shopping', 'Travel & Bookings', 'Security & Account', 'Action Required', 'Updates & Notifications', 'Promotions & Marketing', 'Personal'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
"""
content = re.sub(filter_buttons_regex, r'\1' + dropdown_ui, content, count=1, flags=re.DOTALL)

# Modify email sorting logic
# We need to sort the .map(email => ...) part to prioritize sortCategory
# Current: }).map(email => {
sort_logic = """}).sort((a, b) => {
                      if (sortCategory) {
                        if (a.category === sortCategory && b.category !== sortCategory) return -1;
                        if (a.category !== sortCategory && b.category === sortCategory) return 1;
                      }
                      return new Date(b.received_at) - new Date(a.received_at);
                    }).map(email => {"""
content = content.replace("}).map(email => {", sort_logic)

# Fix the polling interval to run immediately on toggle
polling_effect_old = """  // Auto-sync polling
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
  }, [isSyncing]);"""

polling_effect_new = """  // Auto-sync polling
  useEffect(() => {
    let interval;
    if (isSyncing) {
      const syncNow = () => {
        fetch(${API_BASE}/emails/fetch/sync, { method: 'POST', headers: getHeaders() })
          .then(() => fetchEmails())
          .catch(console.error);
      };
      syncNow(); // Run immediately
      interval = setInterval(syncNow, 15000);
    }
    return () => clearInterval(interval);
  }, [isSyncing]);"""
content = content.replace(polling_effect_old, polling_effect_new)

with open('App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("App.jsx updated with sorting and immediate sync!")
