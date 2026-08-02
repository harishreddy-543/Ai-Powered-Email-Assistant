import os
import pickle
import numpy as np
from typing import List, Dict, Tuple, Any
from app.models import models

INDEX_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "ml", "models", "vector_index.pkl")
os.makedirs(os.path.dirname(INDEX_FILE), exist_ok=True)

# Try loading SentenceTransformer
try:
    from sentence_transformers import SentenceTransformer
    embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
    print("Sentence-Transformer model loaded successfully.")
except Exception as e:
    print(f"Sentence-Transformer could not be loaded ({e}). Falling back to TF-IDF text similarity.")
    embedding_model = None


# --- Simple Local TF-IDF Fallback Vectorizer ---
class SimpleVectorizer:
    def __init__(self):
        self.vocab = {}
        
    def fit_transform(self, texts: List[str]) -> np.ndarray:
        # Build very basic vocab
        words_set = set()
        for t in texts:
            words_set.update(self._tokenize(t))
        self.vocab = {w: i for i, w in enumerate(sorted(list(words_set)))}
        return self.transform(texts)
        
    def transform(self, texts: List[str]) -> np.ndarray:
        if not self.vocab:
            # Fallback vocabulary
            self.vocab = {"email": 0, "work": 1, "phish": 2, "spam": 3, "meeting": 4, "invoice": 5}
            
        vectors = np.zeros((len(texts), len(self.vocab)))
        for idx, t in enumerate(texts):
            tokens = self._tokenize(t)
            for token in tokens:
                if token in self.vocab:
                    vectors[idx, self.vocab[token]] += 1
            # Normalize
            norm = np.linalg.norm(vectors[idx])
            if norm > 0:
                vectors[idx] = vectors[idx] / norm
        return vectors
        
    def _tokenize(self, text: str) -> List[str]:
        return re.findall(r"\b[a-z]{3,15}\b", text.lower())

import re
fallback_vectorizer = SimpleVectorizer()


# --- Vector Service Implementation ---

class VectorService:
    def __init__(self):
        self.embeddings: List[np.ndarray] = []
        self.email_ids: List[int] = []
        self._load_index()

    def _load_index(self):
        if os.path.exists(INDEX_FILE):
            try:
                with open(INDEX_FILE, "rb") as f:
                    data = pickle.load(f)
                    self.embeddings = data.get("embeddings", [])
                    self.email_ids = data.get("email_ids", [])
                print(f"Loaded {len(self.email_ids)} indexed emails from vector index.")
            except Exception as e:
                print(f"Failed to load vector index: {e}")
                self.embeddings = []
                self.email_ids = []

    def _save_index(self):
        try:
            with open(INDEX_FILE, "wb") as f:
                pickle.dump({
                    "embeddings": self.embeddings,
                    "email_ids": self.email_ids
                }, f)
        except Exception as e:
            print(f"Failed to save vector index: {e}")

    def get_embedding(self, text: str) -> np.ndarray:
        """Helper to get a single vector embedding from text"""
        if embedding_model:
            try:
                return embedding_model.encode(text)
            except Exception as e:
                print(f"Embedding error: {e}")
        
        # TF-IDF Hashing Fallback
        vec = fallback_vectorizer.transform([text])[0]
        return vec

    def index_email(self, email_id: int, subject: str, body: str):
        """Index a single email in the vector store"""
        # If already indexed, remove it to prevent duplicates
        if email_id in self.email_ids:
            idx = self.email_ids.index(email_id)
            self.email_ids.pop(idx)
            self.embeddings.pop(idx)
            
        combined_text = f"Subject: {subject or ''}\nBody: {body or ''}"
        emb = self.get_embedding(combined_text)
        
        self.embeddings.append(emb)
        self.email_ids.append(email_id)
        self._save_index()

    def search_similar(self, query: str, limit: int = 5) -> List[Tuple[int, float]]:
        """Perform semantic search, returning a list of tuples (email_id, similarity_score)"""
        if not self.embeddings:
            return []
            
        q_emb = self.get_embedding(query)
        
        # Calculate cosine similarity using numpy
        results = []
        for idx, emb in enumerate(self.embeddings):
            # Compute dot product
            dot = np.dot(q_emb, emb)
            q_norm = np.linalg.norm(q_emb)
            emb_norm = np.linalg.norm(emb)
            
            similarity = 0.0
            if q_norm > 0 and emb_norm > 0:
                similarity = float(dot / (q_norm * emb_norm))
                
            results.append((self.email_ids[idx], similarity))
            
        # Sort by similarity descending
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:limit]

    def remove_email(self, email_id: int):
        """Delete an email from the vector index"""
        if email_id in self.email_ids:
            idx = self.email_ids.index(email_id)
            self.email_ids.pop(idx)
            self.embeddings.pop(idx)
            self._save_index()

# Global Singleton Vector Service
vector_service = VectorService()
