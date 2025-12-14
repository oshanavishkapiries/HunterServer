import os
from dotenv import load_dotenv

load_dotenv()

BASE_URL: str = "https://www.linkedin.com"
DRIVER_DIR: str = "driver"
AUTH_METHOD: str = os.getenv("AUTH_METHOD", "cookie").lower()
COOKIE_FILE_PATH: str = os.getenv("COOKIE_FILE_PATH", "cookie.json")
LINKEDIN_USERNAME: str = os.getenv("LINKEDIN_USERNAME", "")
LINKEDIN_PASSWORD: str = os.getenv("LINKEDIN_PASSWORD", "")
DEFAULT_JOB_KEYWORDS: str = os.getenv("JOB_KEYWORDS", "Software Engineer")
DEFAULT_JOB_LOCATION: str = os.getenv("JOB_LOCATION", "Remote")
IMPLICIT_WAIT: int = 10
PAGE_LOAD_TIMEOUT: int = 30
EXPLICIT_WAIT: int = 15
