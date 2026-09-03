import os

from dotenv import load_dotenv


load_dotenv()


APP_NAME = os.getenv(
    "APP_NAME",
    "Nova AI Workspace",
)

APP_VERSION = os.getenv(
    "APP_VERSION",
    "0.4.0",
)

DEBUG = (
    os.getenv(
        "DEBUG",
        "False",
    ).lower()
    == "true"
)


AI_PROVIDER = os.getenv(
    "AI_PROVIDER",
    "ollama",
).lower()


# Local Ollama configuration

OLLAMA_HOST = os.getenv(
    "OLLAMA_HOST",
    "http://127.0.0.1:11434",
)

OLLAMA_MODEL = os.getenv(
    "OLLAMA_MODEL",
    "llama3.2:3b",
)


# Hosted AI configuration

AI_BASE_URL = os.getenv(
    "AI_BASE_URL",
    "",
)

AI_API_KEY = os.getenv(
    "AI_API_KEY",
    "",
)

AI_MODEL = os.getenv(
    "AI_MODEL",
    "",
)