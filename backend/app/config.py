import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://proc:procpass@127.0.0.1:3306/procurement?charset=utf8mb4")
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-change-me")
    ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "ChangeMe-123")
    SEED_DEMO = os.getenv("SEED_DEMO", "0") == "1"
    SESSION_COOKIE_NAME = "proc_session"
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = os.getenv("COOKIE_SECURE", "0") == "1"
    PERMANENT_SESSION_LIFETIME = 60 * 60 * 12  # 12 hours
    JSON_AS_ASCII = False
