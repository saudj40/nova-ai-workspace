from dotenv import load_dotenv
import os

# Load variables from the .env file
load_dotenv()

APP_NAME = os.getenv("APP_NAME")
APP_VERSION = os.getenv("APP_VERSION")
DEBUG = os.getenv("DEBUG") == "True"

AI_PROVIDER = os.getenv("AI_PROVIDER")
OLLAMA_HOST = os.getenv("OLLAMA_HOST")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL")