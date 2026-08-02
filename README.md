# AI-Powered Intelligent Email Assistant

An advanced, end-to-end AI application that automates email management, security scanning, semantic indexing, summarization, and response drafting. Built using **Python, FastAPI, React, Tailwind CSS, SQL databases, and Machine Learning / LLMs**.

This portfolio-ready system runs fully locally out-of-the-box (using SQLite, custom ML models, and local text similarity fallbacks) but is architected to switch seamlessly to production environments (PostgreSQL, Redis, FAISS vector indexing, IMAP mailboxes, and OpenAI GPT APIs).

---

## Key Features

1. **AI Mail Processing Pipeline (Agent)**:
   - **Spam Filter**: TF-IDF text features parsed through a Multinomial Naive Bayes model.
   - **Phishing Scan**: Random Forest model analyzing email context, urgent keywords, URL indicators, and domain matches.
   - **Email Categorization**: Multi-class XGBoost classifier grouping mail into *Work, Personal, Finance, Promotion, Social, and Updates*.
   - **Priority & Urgency Check**: Forest ensemble assessing deadlines, sender importance, and key urgencies.
   - **Sentiment Analysis**: Dynamic scoring to detect emotional tone (*Positive, Neutral, Negative*).
   - **NER Extraction**: Extracts *People, Organizations, Money, and Dates* via spaCy (with regex-based safety checks).
2. **Retrieval-Augmented Generation (RAG)**:
   - Queries semantic vector similarities to check past conversations.
   - Summarizes long messages into structured action logs (deadlines, objectives, contacts).
   - Drafts smart context-aware replies according to user writing preferences (*Professional, Friendly, Direct*).
3. **Interactive UI Dashboard**:
   - **Smart Inbox**: Prioritized lists, category tags, read trackers, and hoverable NER detail chips.
   - **Threat Center**: Detailed warn alerts showing phishing threat statistics.
   - **AI Analytics**: Live data charts showing volume timelines, category distributions, and security alert ratios.
   - **Agent Console**: Real-time console printing background pipeline steps.
   - **Semantic Search**: Text similarities scores displayed as radial percentages.

---

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── api/             # API Router scripts (auth, emails, analytics)
│   │   ├── core/            # Configs, JWT tokens, and security contexts
│   │   ├── db/              # SQLAlchemy session middleware
│   │   ├── models/          # SQLAlchemy schemas (emails, users, replies, feedback)
│   │   ├── schemas/         # Pydantic validation structures
│   │   ├── services/        # Fetchers, ML predictions, RAG replies, and vector indexes
│   │   └── main.py          # FastAPI server entry point
│   ├── ml/                  # Machine Learning modules
│   │   ├── datasets/        # Synthetic training data compilers
│   │   ├── train.py         # Offline model training pipeline script
│   │   └── models/          # joblib binary files
│   └── requirements.txt     # Python packages
├── frontend/
│   ├── src/                 # React UI code
│   │   ├── App.jsx          # Dashboard layout & API queries
│   │   ├── index.css        # Tailwind styles & console animations
│   │   └── main.jsx
│   ├── index.html
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
├── docker-compose.yml       # Production deployment configs
└── README.md                # Repository setup documentation
```

---

## Local Setup & Quick Start

### 1. Backend Installation & Model Training

Navigate to the `backend` folder:
```bash
cd backend
```

Create a virtual environment and activate it:
```bash
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

Install the dependencies:
```bash
pip install -r requirements.txt
```

Run the model training script to generate the synthetic corpus, train your classifiers (Naive Bayes, Random Forest, XGBoost), and write the model binaries:
```bash
python ml/train.py
```

Start the FastAPI application:
```bash
python app/main.py
```
The server will boot on `http://localhost:8000`. You can inspect the interactive Swagger API documentation at `http://localhost:8000/docs`.

### 2. Frontend Installation & Startup

Open a new terminal window and navigate to the `frontend` folder:
```bash
cd frontend
```

Install npm dependencies:
```bash
npm install
```

Start the Vite hot-reloading development server:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

### 3. Usage & Simulation

- Click **Sign Up** on the login screen to register an account, then log in.
- In the top header, click **Simulate Incoming Email** to generate a mock incoming message.
- Go to the **Agent Terminal** tab to watch the AI agent process the email in real-time.
- Go back to the **Inbox** to check category labels, priority tags, security alerts, and drafted smart replies.
- Try editing the smart reply, correcting category tags (which logs reinforcement feedback), or searching for keywords in the **Semantic Search** tab.

---

## Configuration & Production Settings

Create a `.env` file in the `backend` folder to configure real services:

```env
# Database overrides
DATABASE_URL=postgresql://user:password@localhost:5432/email_db

# LLM integration keys
OPENAI_API_KEY=sk-proj-...

# Real IMAP Email Sync (Gmail/Outlook app passwords)
REAL_EMAIL_SYNC_ENABLED=true
IMAP_SERVER=imap.gmail.com
IMAP_USERNAME=your_address@gmail.com
IMAP_PASSWORD=your_app_password
```
