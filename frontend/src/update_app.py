import re

with open('App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove URGENT filter button
content = re.sub(r"\{\s*id:\s*'urgent'.*?\},?\s*", "", content)
content = re.sub(r"if \(securityFilter === 'urgent'\) return email\.priority === 'Critical' \|\| email\.priority === 'High';\s*", "", content)

# 2. Tooltips for Phishing Risk, Spam Score, Model Confidence
phishing_tooltip = r'title="Probability that this email contains malicious phishing links or requests"'
content = content.replace('<span>Phishing Risk</span>', f'<span {phishing_tooltip} className="cursor-help border-b border-dashed border-zinc-500">Phishing Risk</span>')

spam_tooltip = r'title="Probability that this email is unsolicited junk or promotional spam"'
content = content.replace('<span>Spam Score</span>', f'<span {spam_tooltip} className="cursor-help border-b border-dashed border-zinc-500">Spam Score</span>')

conf_tooltip = r'title="The ML model\'s certainty in its overall classification and threat predictions"'
content = content.replace('<span>Model Confidence</span>', f'<span {conf_tooltip} className="cursor-help border-b border-dashed border-zinc-500">Model Confidence</span>')
# Fix Model Confidence calculation (100 - spam_score*10 is fake)
content = content.replace('Math.round(100 - (selectedEmail.spam_score*10))', 'Math.round((1 - Math.abs(selectedEmail.spam_score - 0.5)*2) * 100)')

# 3. Remove "Correct AI" dropdown
# It's a select element with "Correct AI"
correct_ai_pattern = r'<div className="mt-8 pt-6 border-t border-zinc-800/50">.*?<span className="text-xs font-bold text-zinc-500">Correct AI:</span>.*?</select>\s*</div>'
content = re.sub(correct_ai_pattern, "", content, flags=re.DOTALL)

# 4. Remove Entities Tab and reorder to Original Message, AI Summary, Smart Reply
tabs_pattern = r"const tabs = \['Original Message', 'AI Summary', 'Entities', 'Smart Reply'\];"
content = content.replace(tabs_pattern, "const tabs = ['Original Message', 'AI Summary', 'Smart Reply'];")

# Remove entities tab content
entities_tab_pattern = r"\{activeTab === 'Entities' && \(.*?\}\)\}"
# We'll just replace the string that checks activeTab === 'Entities'
content = content.replace("{activeTab === 'Entities' && (", "{false && (")

# 5. Fix Category Bar Chart Labels
# They said "make the horizontally and increase the gap between each bar graph"
# We'll add barCategoryGap to BarChart and rotate angle to 0.
content = content.replace('<BarChart data={analytics?.category_distribution || []} margin={{ top: 10, right: 0, left: -20, bottom: 25 }}>', '<BarChart data={analytics?.category_distribution || []} margin={{ top: 10, right: 0, left: -20, bottom: 35 }} barCategoryGap="20%">')

with open('App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated App.jsx successfully!")
