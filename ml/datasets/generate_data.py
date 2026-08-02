import csv
import random

# Task 1: Update categories.csv
categories = [
    "Work & Projects", 
    "Education & Career", 
    "Finance & Payments", 
    "Orders & Shopping", 
    "Travel & Bookings", 
    "Security & Account", 
    "Action Required", 
    "Updates & Notifications", 
    "Promotions & Marketing", 
    "Personal"
]

category_samples = {
    "Work & Projects": [
        "The quarterly financial report is attached.",
        "Can you review the pull request before EOD?",
        "Here is the agenda for the sprint planning session.",
        "Let's schedule a call to discuss the new project.",
        "Please find the updated project timeline attached.",
        "Meeting minutes from today's sync are ready for review.",
        "We need to finalize the Q3 marketing strategy by Friday.",
        "Please review the design mockups for the new landing page.",
        "Can you send me the latest metrics for the ad campaign?",
        "Our team meeting is moved to 2 PM tomorrow."
    ],
    "Education & Career": [
        "Your application for the Software Engineer position was received.",
        "Welcome to the Machine Learning course!",
        "Your assignment has been graded.",
        "We would like to invite you to an interview at LinkedIn.",
        "Codegnan placements are starting next week, prepare your resume.",
        "Congratulations on completing your certification.",
        "Your upcoming course schedule for Fall 2026.",
        "Job alert: New positions matching your profile.",
        "We reviewed your resume and would like to proceed with the next round.",
        "Join our webinar on career growth and development."
    ],
    "Finance & Payments": [
        "Your invoice #1234 is due next week.",
        "Bank statement for July 2026 is ready.",
        "Tax documents attached for review.",
        "Payment received for your subscription.",
        "Your recent transaction on your credit card was approved.",
        "Important update regarding your account fees.",
        "Your salary has been credited to your account.",
        "Action needed: update your billing information.",
        "Receipt for your recent purchase at the Apple Store.",
        "Your monthly expense report is ready."
    ],
    "Orders & Shopping": [
        "Your Amazon order has shipped.",
        "Order confirmation: Your items are being processed.",
        "Your package is out for delivery.",
        "Rate your recent purchase.",
        "Items in your cart are selling fast!",
        "Your refund has been processed.",
        "Delivery update: Your package will arrive tomorrow.",
        "Thank you for shopping with us! Here is your receipt.",
        "Your grocery delivery is on the way.",
        "Pre-order confirmed for the new smartphone."
    ],
    "Travel & Bookings": [
        "Your flight is confirmed for tomorrow morning.",
        "Hotel reservation details for your upcoming trip.",
        "Your train ticket is attached.",
        "Check-in for your flight opens in 24 hours.",
        "Rental car booking confirmation.",
        "Your trip itinerary has been updated.",
        "Welcome to Paris! Here are some things to do.",
        "Your Airbnb booking is confirmed.",
        "Flight delay notice for AA123.",
        "Thank you for booking with Expedia."
    ],
    "Security & Account": [
        "Your password was changed recently.",
        "New login detected from an unrecognized device.",
        "Verify your email address.",
        "Two-factor authentication code: 123456.",
        "Security alert: unusual activity on your account.",
        "Your account has been locked due to multiple failed login attempts.",
        "Update your security questions.",
        "Action required: reset your password.",
        "Privacy policy update notice.",
        "Your security settings have been updated successfully."
    ],
    "Action Required": [
        "Action Required: Complete your performance review.",
        "Please sign the attached NDA.",
        "Your immediate attention is needed regarding this matter.",
        "Action needed: Confirm your attendance for the workshop.",
        "Please verify your identity to continue using our services.",
        "Action required: Renew your domain name.",
        "You have a pending approval request in the system.",
        "Please submit your timesheet for this week.",
        "Action Required: Update your contact details.",
        "Urgent: Respond to the customer query ASAP."
    ],
    "Updates & Notifications": [
        "GitHub Action passed successfully.",
        "Your daily summary is here.",
        "New features have been added to your app.",
        "System maintenance scheduled for this weekend.",
        "Your application status has been updated.",
        "A new version of the software is available.",
        "Weekly newsletter from our team.",
        "Your post has received new comments.",
        "Someone mentioned you in a comment.",
        "Update on your recent support ticket."
    ],
    "Promotions & Marketing": [
        "Limited time offer 90% off all designer items.",
        "Summer sale starts now!",
        "Exclusive discount just for you.",
        "Buy one get one free at our store today!",
        "Don't miss out on our biggest sale of the year.",
        "Get 20% off your next purchase with this code.",
        "Discover our new summer collection.",
        "Special birthday treat from us to you.",
        "Flash sale: 50% off sitewide for 24 hours.",
        "Upgrade to premium and get your first month free."
    ],
    "Personal": [
        "Happy birthday! Hope you have a great day.",
        "Hey, are we still meeting for lunch tomorrow?",
        "Did you see the new movie that came out?",
        "Mom's birthday party is this Saturday.",
        "Just checking in, how have you been?",
        "Let's catch up over coffee this weekend.",
        "Can you send me the recipe for that cake?",
        "Thinking of you, hope you're doing well.",
        "Are you going to the concert next week?",
        "Happy anniversary! Have a wonderful evening."
    ]
}

categories_data = [["text", "label"]]
for category, samples in category_samples.items():
    # duplicate samples to hit ~50-100 total (we have 100 base)
    for sample in samples:
        categories_data.append([sample, category])

with open("categories.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerows(categories_data)

# Task 2: Update spam.csv and phishing.csv with negative examples
spam_negatives = [
    ["Hi, checking if you received my message on LinkedIn regarding the software engineer role.", 0],
    ["Codegnan placements are starting tomorrow for the 2026 batch.", 0],
    ["Job alert: 10 new opportunities for Python Developer.", 0],
    ["Your application for the Senior Backend Engineer position has been viewed.", 0],
    ["Welcome to the job portal, please complete your profile.", 0],
    ["LinkedIn: You appeared in 15 searches this week.", 0]
]

phishing_negatives = [
    ["Hi, checking if you received my message on LinkedIn regarding the software engineer role.", 0],
    ["Codegnan placements are starting tomorrow for the 2026 batch.", 0],
    ["Job alert: 10 new opportunities for Python Developer.", 0],
    ["Your application for the Senior Backend Engineer position has been viewed.", 0],
    ["Welcome to the job portal, please complete your profile.", 0],
    ["LinkedIn: You appeared in 15 searches this week.", 0]
]

# Read existing spam and append
try:
    with open("spam.csv", "r", newline="", encoding="utf-8") as f:
        spam_data = list(csv.reader(f))
except FileNotFoundError:
    spam_data = [["text", "label"]]

spam_data.extend(spam_negatives)

with open("spam.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerows(spam_data)

# Read existing phishing and append
try:
    with open("phishing.csv", "r", newline="", encoding="utf-8") as f:
        phishing_data = list(csv.reader(f))
except FileNotFoundError:
    phishing_data = [["text", "label"]]

phishing_data.extend(phishing_negatives)

with open("phishing.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerows(phishing_data)

print("Data generation complete.")
