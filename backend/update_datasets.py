import csv
import random

new_categories = [
    'Work & Projects', 'Education & Career', 'Finance & Payments', 
    'Orders & Shopping', 'Travel & Bookings', 'Security & Account', 
    'Action Required', 'Updates & Notifications', 'Promotions & Marketing', 'Personal'
]

# Create new categories.csv
with open('ml/datasets/categories.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['text', 'label'])
    
    # Add dummy data for each category to ensure they are represented
    for cat in new_categories:
        for _ in range(50):
            writer.writerow([f"dummy {cat.lower()} email content {random.randint(1, 1000)}", cat])
            
    # Add some realistic examples
    writer.writerow(["Project status meeting tomorrow at 10 AM. Please bring the reports.", "Work & Projects"])
    writer.writerow(["Technical interview scheduled for next week with the hiring manager.", "Education & Career"])
    writer.writerow(["Your credit card payment of .00 is due on the 15th.", "Finance & Payments"])
    writer.writerow(["Your Amazon order has been shipped and will arrive tomorrow.", "Orders & Shopping"])
    writer.writerow(["Flight booking confirmed. Your e-ticket is attached.", "Travel & Bookings"])
    writer.writerow(["Security alert: New login detected from an unrecognized device.", "Security & Account"])
    writer.writerow(["Action Required: Please submit the NDA document by Friday.", "Action Required"])
    writer.writerow(["Product update: Check out the new features we released this week.", "Updates & Notifications"])
    writer.writerow(["50% off all items this weekend only! Don't miss our huge sale.", "Promotions & Marketing"])
    writer.writerow(["Hey, are we still on for dinner this weekend? Let me know.", "Personal"])

# Append safe examples to spam.csv
with open('ml/datasets/spam.csv', 'a', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    # 0 means NOT spam
    writer.writerow(["Harish, your profile is getting hits on LinkedIn. See who's looking.", "0"])
    writer.writerow(["New form assigned: Week 17 to 24 - Softskills - Students Experience Feedback from Codegnan", "0"])
    writer.writerow(["Interview invitation for Software Engineer role at Google", "0"])
    writer.writerow(["Please review your placement status on the portal.", "0"])
    writer.writerow(["Connection request from John Doe on LinkedIn", "0"])

# Append safe examples to phishing.csv
with open('ml/datasets/phishing.csv', 'a', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    # 0 means NOT phishing
    writer.writerow(["Harish, your profile is getting hits on LinkedIn. See who's looking.", "0"])
    writer.writerow(["New form assigned: Students Experience Feedback from Codegnan", "0"])
    writer.writerow(["Interview invitation for Software Engineer role at Google", "0"])
    writer.writerow(["Please review your placement status on the portal.", "0"])
    writer.writerow(["Connection request from John Doe on LinkedIn", "0"])

print('Datasets updated.')
