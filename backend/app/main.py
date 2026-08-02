from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.session import engine, Base
from app.api import auth, emails

# Automatically create SQLAlchemy tables on startup
try:
    Base.metadata.create_all(bind=engine)
    print("Database tables initialized successfully.")
except Exception as e:
    print(f"Database table initialization failed: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Configure CORS Middleware for React Integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(emails.router, prefix=f"{settings.API_V1_STR}/emails", tags=["Emails"])

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Welcome to the AI-Powered Intelligent Email Assistant API",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="localhost", port=8000, reload=True)
