import os


class Config:
    AI_SERVICE_TOKEN = os.getenv("AI_SERVICE_TOKEN", "")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
    CHROMA_DIR = os.getenv("CHROMA_DIR", "/data/chroma")
    RETRIEVAL_LIMIT = int(os.getenv("RETRIEVAL_LIMIT", "8"))
