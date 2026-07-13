from fastapi import FastAPI

app = FastAPI(
    title="Nova AI Workspace",
    description="Building a personal AI platform from scratch",
    version="0.1.0"
)


@app.get("/")
def home():
    return {
        "message": "Welcome to Nova AI Workspace 🚀"
    }