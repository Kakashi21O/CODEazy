import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "server" / "data"

# JWT Config
JWT_SECRET = os.getenv("JWT_SECRET", "codeazy_super_secret_jwt_key_2024")
JWT_ALGORITHM = "HS256"
JWT_EXPIRES_IN_DAYS = 7
