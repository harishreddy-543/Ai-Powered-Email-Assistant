import random
import pandas as pd
from typing import List, Dict

CATEGORIES = ["Work", "Personal", "Promotion", "Finance", "Social", "Updates"]
PRIORITIES = ["Low", "Medium", "High", "Critical"]

# Labeled templates to build a rich training dataset
WORK_TEMPLATES = [
    "Hi team, just a reminder that the client project kickoff meeting is scheduled for tomorrow at 10 AM EST. Please review the agenda and come prepared with your team updates.",
    "Hello, attached is the draft software architecture document for the new microservices project. Please leave your comments and feedback on the API designs by Friday EOD.",
    "Dear team, please find the quarterly performance targets and KPIs attached. We need to focus on optimizing the database performance and improving API latency this sprint.",
    "Hi all, the engineering sprint review is scheduled for today at 4 PM. We will demonstrate the new JWT login flow and the PostgreSQL database migrations.",
    "Hello team, please update your Jira tasks for the current sprint. We need to resolve all critical security vulnerabilities before the staging deployment next Tuesday.",
    "Hi, here is the updated project budget spreadsheet. We have allocated additional budget for AWS hosting, server monitoring, and Docker registry storage."
]

PERSONAL_TEMPLATES = [
    "Hey! Are we still on for dinner this Saturday? Let me know if you want to try that new Italian restaurant downtown, or just order some pizza.",
    "Hi Mom, I wanted to catch up and see how your doctor appointment went. Let me know when you have some time to chat on the phone this weekend.",
    "Hey mate, just wanted to check if you're free to play soccer this Sunday morning. We need one more player for the local league match.",
    "Hi, thanks for inviting me to your birthday party! I will definitely be there. Let me know if you need me to bring any drinks or snacks.",
    "Hey, just sending you the coordinates for our camping trip next month. Remember to pack warm clothes and a sleeping bag.",
    "Hi there, just wanted to check in and see how you are doing. It's been a while since we caught up over coffee. Let's meet up soon!"
]

PROMOTION_TEMPLATES = [
    "Exclusive Offer: Get 50% off all courses this weekend only! Master Python, Machine Learning, and Large Language Models. Use code AI50 at checkout.",
    "Super Sale! Upgrade your wardrobe with our latest summer collection. Free shipping on all orders above $50. Shop now and save big!",
    "Limited time only: Buy one subscription, get one free! Level up your productivity with our cloud storage and collaborative document tools.",
    "Don't miss out on our annual clearance event. Up to 70% off electronics, laptops, smartwatches, and headphones. Ends tonight!",
    "Special discount just for you. Sign up for our premium newsletter today and get a free e-book on advanced generative AI engineering.",
    "Your weekly deals are here. Get amazing discounts on flight bookings, hotel reservations, and rental cars. Start planning your vacation today!"
]

FINANCE_TEMPLATES = [
    "Dear customer, your monthly credit card statement for July 2026 is now available online. Your minimum payment of $35 is due by August 15.",
    "Notification: A direct deposit of $2,500 has been credited to your checking account. Your current available balance is $6,420.50.",
    "Important Update: Your annual tax document Form 1099-INT is now ready for download. Please log into your secure banking portal to access it.",
    "Alert: We detected a transaction of $450.00 at an electronics store. If this was not you, please contact our fraud department immediately.",
    "Your monthly portfolio report is ready. Your investments have seen a 3.5% growth this month. Check the breakdown of your mutual funds.",
    "Dear policyholder, this is a reminder that your auto insurance premium payment of $120.00 is scheduled for auto-pay on August 1."
]

SOCIAL_TEMPLATES = [
    "Hi, you have 3 new connection requests on LinkedIn. See who wants to connect with you and expand your professional network today.",
    "Someone viewed your profile! Upgrade to Premium to see the full list of recruiters and managers who searched for you this week.",
    "Your friend tagged you in a photo. Log in to view the photo, leave a comment, or share it with your followers.",
    "Trending in your network: Read the latest posts on DevOps automation, FastAPI microservices, and Pinecone vector database deployments.",
    "Hi, your post has received 15 likes and 4 comments. Click here to respond to your connections and keep the conversation going.",
    "You have a new message from Sarah on Twitter. 'Hey, loved your article on building end-to-end AI applications! Let's collaborate.'"
]

UPDATES_TEMPLATES = [
    "Your GitHub action workflow run has completed successfully. All unit tests passed, and the Docker image was built and pushed to the registry.",
    "Your subscription to Cloud Assistant Pro has been renewed automatically. Thank you for your continued support and membership.",
    "Security Alert: A new login was detected from a Chrome browser on a Windows device. If this was you, no action is required.",
    "We have updated our Terms of Service and Privacy Policy. Please review the changes regarding data encryption and user feedback logs.",
    "Your package has been shipped and is out for delivery. You can track your shipment using the tracking number attached.",
    "Hi, your account verification is complete. You can now access all premium analytics dashboards, vector search, and summary features."
]

SPAM_TEMPLATES = [
    "CONGRATULATIONS! You have been selected as the winner of a free iPhone 15 Pro. Click this link immediately to claim your prize now!",
    "Earn $5000 a day working from home! No experience required, set your own hours. Click here to sign up for this once-in-a-lifetime opportunity.",
    "Lose 20 pounds in 2 weeks with this miracle weight loss pill. 100% natural ingredients, no exercise needed. Order your trial bottle today!",
    "Dear friend, I am Prince Collins from Nigeria. I need your assistance to transfer $15 million out of my country. You will receive 30% of it.",
    "Get rich quick! Invest $100 in bitcoin today and receive $10,000 tomorrow. Guaranteed returns, zero risk. Register at this secret website.",
    "Cheapest pharmacy online! Buy generic drugs without prescription. Fast shipping worldwide, discreet packaging, huge discount rates!"
]

PHISHING_TEMPLATES = [
    "URGENT: Your Netflix account has been suspended due to billing issues. Please click here to update your credit card details immediately.",
    "Security Notification: We detected unauthorized login attempts to your bank account from another state. Please reset your password using this link.",
    "PayPal Alert: Suspicious transaction detected. Your account has been restricted. Verification required. Click here to confirm your identity.",
    "Microsoft Office 365: Your password expires in 24 hours. Click this link to keep your current password and avoid losing email access.",
    "Amazon Support: Someone attempted to purchase a MacBook using your account. If this was not you, verify your billing info now: click here.",
    "Dear employee, please review the revised HR policy regarding salary structures and bonus plans. Download the attachment and log in with your credentials."
]

def generate_dataset(n_samples: int = 600) -> pd.DataFrame:
    data = []
    
    # 1. Ham emails (distributed across work, personal, finance, promotion, social, updates)
    for _ in range(int(n_samples * 0.7)):
        cat = random.choice(CATEGORIES)
        if cat == "Work":
            body = random.choice(WORK_TEMPLATES)
            priority = random.choice(["Medium", "High", "Critical"])
        elif cat == "Personal":
            body = random.choice(PERSONAL_TEMPLATES)
            priority = random.choice(["Low", "Medium"])
        elif cat == "Promotion":
            body = random.choice(PROMOTION_TEMPLATES)
            priority = "Low"
        elif cat == "Finance":
            body = random.choice(FINANCE_TEMPLATES)
            priority = random.choice(["Medium", "High"])
        elif cat == "Social":
            body = random.choice(SOCIAL_TEMPLATES)
            priority = "Low"
        else:
            body = random.choice(UPDATES_TEMPLATES)
            priority = random.choice(["Low", "Medium"])
            
        # Add some variation by adding random subject lines
        subject = f"{cat} Notification: {body[:30]}..."
        
        data.append({
            "subject": subject,
            "body": body,
            "category": cat,
            "priority": priority,
            "is_spam": 0,
            "is_phishing": 0
        })
        
    # 2. Spam emails
    for _ in range(int(n_samples * 0.15)):
        body = random.choice(SPAM_TEMPLATES)
        subject = f"WINNER! {body[:25]}..."
        data.append({
            "subject": subject,
            "body": body,
            "category": "Spam",
            "priority": "Low",
            "is_spam": 1,
            "is_phishing": 0
        })
        
    # 3. Phishing emails
    for _ in range(int(n_samples * 0.15)):
        body = random.choice(PHISHING_TEMPLATES)
        subject = f"ALERT: {body[:25]}..."
        data.append({
            "subject": subject,
            "body": body,
            "category": "Spam",  # Phishing is marked under Spam category
            "priority": "Critical",
            "is_spam": 0,
            "is_phishing": 1
        })
        
    df = pd.DataFrame(data)
    # Shuffle dataset
    df = df.sample(frac=1).reset_index(drop=True)
    return df

if __name__ == "__main__":
    df = generate_dataset()
    print(f"Generated synthetic dataset with {len(df)} samples.")
    print(df.head(2))
