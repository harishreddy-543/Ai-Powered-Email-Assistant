import os
import pandas as pd
import numpy as np
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder

# Data generators
def generate_spam_data():
    spam = [
        "Earn $5000 from home easily!", "Congratulations you won a free iPhone click here",
        "Buy cheap generic pharmacy pills without prescription", "Your paypal account is restricted, verify now",
        "Invest in bitcoin and get rich quick", "You are the lucky winner of our lottery",
        "Lose weight fast with this miracle pill", "Limited time offer 90% off all designer items",
        "Meet hot singles in your area tonight", "Claim your free amazon gift card now"
    ] * 30
    
    ham = [
        "Hey, are we still meeting for lunch tomorrow?", "The quarterly financial report is attached.",
        "Can you review the pull request before EOD?", "Happy birthday! Hope you have a great day.",
        "Your Amazon order has shipped.", "Here is the agenda for the sprint planning session.",
        "Did you see the new movie that came out?", "Let's schedule a call to discuss the new project.",
        "Your flight is confirmed for tomorrow morning.", "Thanks for sending over the invoice.",
        "LinkedIn: New jobs similar to Data Analyst", "Your profile is getting hits on LinkedIn",
        "placements@codegnan.com: New form assigned for placements", "Interview scheduled for tomorrow",
        "Your Google Security alert", "Google: You allowed access to your account"
    ] * 30
    
    df = pd.DataFrame({
        "text": spam + ham,
        "label": [1] * len(spam) + [0] * len(ham)
    })
    return df

def generate_category_data():
    work_projects = ["The quarterly financial report is attached.", "Can you review the pull request before EOD?", "Here is the agenda for the sprint planning session.", "Let's schedule a call to discuss the new project.", "Project status meeting tomorrow", "Jira ticket updated"] * 20
    education_career = ["New jobs similar to Data Analyst", "placements@codegnan.com: New form assigned", "Interview scheduled for tomorrow", "Technical interview scheduled", "Course enrollment confirmed", "Recruiter message"] * 20
    finance_payments = ["Your invoice #1234 is due next week.", "Bank statement for July 2026 is ready.", "Tax documents attached for review.", "Credit card payment due", "Payment received for your subscription."] * 20
    orders_shopping = ["Your Amazon order has shipped.", "Your delivery is arriving today.", "Receipt for your recent purchase", "Your order has been shipped", "Invoice for order #8849"] * 20
    travel_bookings = ["Your flight is confirmed for tomorrow morning.", "Hotel reservation confirmed", "Flight booking confirmed", "Your upcoming trip to New York", "Booking receipt"] * 20
    security_account = ["Security alert: new login", "Your password was changed.", "New login detected", "Verify your email address", "OTP for account login"] * 20
    action_required = ["Please submit the document by Friday", "Action required: sign this form", "Signature requested", "Needs your attention right now", "Please review and approve"] * 20
    updates_notifications = ["GitHub Action passed.", "Your monthly report is available", "System downtime notice", "Update regarding our privacy policy", "Service maintenance tomorrow"] * 20
    promotions_marketing = ["Limited time offer 90% off all designer items", "Summer sale starts now!", "Exclusive discount for you.", "50% off this weekend", "Buy one get one free at our store!"] * 20
    personal = ["Happy birthday! Hope you have a great day.", "Hey, are we still meeting for lunch tomorrow?", "Dinner this weekend?", "Did you see the new movie that came out?", "Mom's birthday party is this Saturday."] * 20
    
    data = work_projects + education_career + finance_payments + orders_shopping + travel_bookings + security_account + action_required + updates_notifications + promotions_marketing + personal
    labels = ["Work & Projects"]*len(work_projects) + ["Education & Career"]*len(education_career) + ["Finance & Payments"]*len(finance_payments) + ["Orders & Shopping"]*len(orders_shopping) + ["Travel & Bookings"]*len(travel_bookings) + ["Security & Account"]*len(security_account) + ["Action Required"]*len(action_required) + ["Updates & Notifications"]*len(updates_notifications) + ["Promotions & Marketing"]*len(promotions_marketing) + ["Personal"]*len(personal)
    
    return pd.DataFrame({"text": data, "label": labels})

def generate_phishing_data():
    phishing = [
        "URGENT: Your PayPal account has been suspended. Click here to verify your identity.",
        "Security Alert: Unauthorized login attempt. Reset your password immediately via this link.",
        "Your bank account will be closed in 24 hours. Verify your details now.",
        "Action required: Update your billing information to avoid service interruption.",
        "You have a secure message from Chase Bank. Click the link to read."
    ] * 30
    
    safe = [
        "Your monthly bank statement is ready to view.",
        "Your PayPal receipt for your recent purchase.",
        "Here is the agenda for our meeting.",
        "Happy birthday!",
        "Your Amazon order has shipped.",
        "LinkedIn: Your profile is getting hits",
        "New jobs similar to Data Analyst at Corner Stone",
        "placements@codegnan.com: New form assigned",
        "Google: Security alert - you allowed access",
        "Your flight is confirmed for tomorrow morning."
    ] * 30
    
    return pd.DataFrame({
        "text": phishing + safe,
        "label": [1] * len(phishing) + [0] * len(safe)
    })

def generate_priority_data():
    critical = ["URGENT: Production server is down!", "Action required immediately to prevent account suspension.", "Critical security vulnerability found in our app.", "Needs your attention right now."] * 20
    high = ["Please review this pull request before EOD.", "Deadline for the project is tomorrow.", "Important update regarding our meeting.", "Action items from today's sync."] * 20
    medium = ["Here is the weekly status report.", "Just checking in on the status of the ticket.", "Let's schedule a call for next week.", "Your invoice is attached."] * 20
    low = ["Weekly newsletter from our company.", "Check out these new items on sale.", "Someone viewed your profile.", "Your order has shipped."] * 20
    
    data = critical + high + medium + low
    labels = ["Critical"]*len(critical) + ["High"]*len(high) + ["Medium"]*len(medium) + ["Low"]*len(low)
    
    return pd.DataFrame({"text": data, "label": labels})

def train_and_save(df, text_col, label_col, model_name, model_type="lr"):
    print(f"Training {model_name}...")
    
    vec = TfidfVectorizer(max_features=1000)
    X = vec.fit_transform(df[text_col])
    
    y = df[label_col]
    encoder = None
    if y.dtype == 'object':
        encoder = LabelEncoder()
        y = encoder.fit_transform(y)
        
    if model_type == "rf":
        clf = RandomForestClassifier(n_estimators=50, random_state=42)
    else:
        clf = LogisticRegression(max_iter=1000, random_state=42)
        
    clf.fit(X, y)
    
    base_path = os.path.join(os.path.dirname(__file__), "models")
    os.makedirs(base_path, exist_ok=True)
    
    joblib.dump(clf, os.path.join(base_path, f"{model_name}_model.joblib"))
    joblib.dump(vec, os.path.join(base_path, f"{model_name}_vectorizer.joblib"))
    if encoder:
        joblib.dump(encoder, os.path.join(base_path, f"{model_name}_encoder.joblib"))
        
    print(f"Saved {model_name} artifacts.")

if __name__ == "__main__":
    print("Generating datasets...")
    spam_df = generate_spam_data()
    cat_df = generate_category_data()
    phish_df = generate_phishing_data()
    prio_df = generate_priority_data()
    
    # Save datasets
    dataset_dir = os.path.join(os.path.dirname(__file__), "datasets")
    os.makedirs(dataset_dir, exist_ok=True)
    spam_df.to_csv(os.path.join(dataset_dir, "spam.csv"), index=False)
    cat_df.to_csv(os.path.join(dataset_dir, "categories.csv"), index=False)
    phish_df.to_csv(os.path.join(dataset_dir, "phishing.csv"), index=False)
    prio_df.to_csv(os.path.join(dataset_dir, "priority.csv"), index=False)
    
    # Train models
    train_and_save(spam_df, "text", "label", "spam", "rf")
    train_and_save(cat_df, "text", "label", "category", "lr")
    train_and_save(phish_df, "text", "label", "phishing", "rf")
    train_and_save(prio_df, "text", "label", "priority", "lr")
    
    print("Done!")
