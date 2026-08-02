import os
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from xgboost import XGBClassifier
from sklearn.preprocessing import LabelEncoder

# Import generator
from datasets.generator import generate_dataset

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODEL_DIR, exist_ok=True)

def train_spam_model(df: pd.DataFrame):
    print("Training Spam Detection Model...")
    X = df["body"]
    y = df["is_spam"]
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    vectorizer = TfidfVectorizer(stop_words="english", max_features=1000)
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)
    
    model = MultinomialNB()
    model.fit(X_train_vec, y_train)
    
    preds = model.predict(X_test_vec)
    print(f"Spam Accuracy: {accuracy_score(y_test, preds):.4f}")
    print(f"Spam F1-Score: {f1_score(y_test, preds):.4f}")
    
    joblib.dump(vectorizer, os.path.join(MODEL_DIR, "spam_vectorizer.joblib"))
    joblib.dump(model, os.path.join(MODEL_DIR, "spam_model.joblib"))

def train_category_model(df: pd.DataFrame):
    print("\nTraining Email Categorization Model...")
    # Clean/filter out spam and phishing for categorization training (only categorize actual ham emails)
    ham_df = df[(df["is_spam"] == 0) & (df["is_phishing"] == 0)]
    
    X = ham_df["body"]
    y = ham_df["category"]
    
    # Label encode category
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)
    
    X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.2, random_state=42)
    
    vectorizer = TfidfVectorizer(stop_words="english", max_features=1000)
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)
    
    # XGBoost classifier
    model = XGBClassifier(n_estimators=50, random_state=42, use_label_encoder=False, eval_metric='mlogloss')
    model.fit(X_train_vec, y_train)
    
    preds = model.predict(X_test_vec)
    print(f"Category Accuracy: {accuracy_score(y_test, preds):.4f}")
    
    joblib.dump(vectorizer, os.path.join(MODEL_DIR, "category_vectorizer.joblib"))
    joblib.dump(model, os.path.join(MODEL_DIR, "category_model.joblib"))
    joblib.dump(le, os.path.join(MODEL_DIR, "category_encoder.joblib"))

def train_phishing_model(df: pd.DataFrame):
    print("\nTraining Phishing Detection Model...")
    # Extract structural features along with text
    # Features: urgent keywords, has links, subject length, domain impersonation
    def extract_features(data_df):
        text_features = []
        for text in data_df["body"]:
            text_lower = text.lower()
            urgent_words = sum([1 for w in ["urgent", "action", "verify", "reset", "billing", "unauthorized", "suspend", "alert"] if w in text_lower])
            has_links = 1 if "click" in text_lower or "link" in text_lower or "http" in text_lower else 0
            text_features.append([urgent_words, has_links])
        return np.array(text_features)
        
    X_text = df["body"]
    X_feats = extract_features(df)
    y = df["is_phishing"]
    
    X_train_text, X_test_text, X_train_feats, X_test_feats, y_train, y_test = train_test_split(
        X_text, X_feats, y, test_size=0.2, random_state=42
    )
    
    vectorizer = TfidfVectorizer(stop_words="english", max_features=500)
    X_train_text_vec = vectorizer.fit_transform(X_train_text).toarray()
    X_test_text_vec = vectorizer.transform(X_test_text).toarray()
    
    # Combine TF-IDF features and structural metadata features
    X_train_combined = np.hstack((X_train_text_vec, X_train_feats))
    X_test_combined = np.hstack((X_test_text_vec, X_test_feats))
    
    model = RandomForestClassifier(n_estimators=50, random_state=42)
    model.fit(X_train_combined, y_train)
    
    preds = model.predict(X_test_combined)
    print(f"Phishing Accuracy: {accuracy_score(y_test, preds):.4f}")
    print(f"Phishing F1-Score: {f1_score(y_test, preds):.4f}")
    
    joblib.dump(vectorizer, os.path.join(MODEL_DIR, "phishing_vectorizer.joblib"))
    joblib.dump(model, os.path.join(MODEL_DIR, "phishing_model.joblib"))

def train_priority_model(df: pd.DataFrame):
    print("\nTraining Priority Prediction Model...")
    # Train only on non-spam/non-phishing emails
    ham_df = df[(df["is_spam"] == 0) & (df["is_phishing"] == 0)]
    
    X = ham_df["body"]
    y = ham_df["priority"]
    
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)
    
    X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.2, random_state=42)
    
    vectorizer = TfidfVectorizer(stop_words="english", max_features=500)
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)
    
    model = RandomForestClassifier(n_estimators=50, random_state=42)
    model.fit(X_train_vec, y_train)
    
    preds = model.predict(X_test_vec)
    print(f"Priority Accuracy: {accuracy_score(y_test, preds):.4f}")
    
    joblib.dump(vectorizer, os.path.join(MODEL_DIR, "priority_vectorizer.joblib"))
    joblib.dump(model, os.path.join(MODEL_DIR, "priority_model.joblib"))
    joblib.dump(le, os.path.join(MODEL_DIR, "priority_encoder.joblib"))

if __name__ == "__main__":
    df = generate_dataset(800)
    train_spam_model(df)
    train_category_model(df)
    train_phishing_model(df)
    train_priority_model(df)
    print("\nAll models trained and saved to:", MODEL_DIR)
