# Nova AI Workspace

> A local-first AI workspace for building practical LLM applications with FastAPI, document RAG, persistent conversation memory, and a modular full-stack architecture.

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Ollama](https://img.shields.io/badge/Ollama-Local%20LLMs-black)](https://ollama.com/)
[![SQLite](https://img.shields.io/badge/SQLite-Memory-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Nova is a personal AI engineering project focused on taking LLM applications beyond a single chat endpoint. The project is structured as a growing AI workspace where local language models, document retrieval, memory, APIs, and a frontend can work together as one system.

---

## What Nova Currently Does

- **Local LLM chat** through an Ollama-backed AI service
- **FastAPI backend** with a modular application structure
- **PDF document upload**
- **Document RAG** for asking questions against uploaded content
- **Persistent conversation memory** using SQLite
- **Frontend workspace** separated from backend services
- **Project documentation** maintained inside the repository
- Designed to evolve toward richer AI tooling and agent-style workflows

---

## Why I Built It

Many AI demos stop at calling a model from a notebook.

Nova is my attempt to practice the engineering around the model as well:

- API design
- provider abstraction
- document ingestion
- retrieval-augmented generation
- conversation persistence
- frontend/backend integration
- clean project organization
- local-first AI development

The goal is to build an AI system that can grow feature by feature without turning into a single large script.

---

## Architecture

```text
┌──────────────────────┐
│       Frontend       │
│   AI workspace UI    │
└──────────┬───────────┘
           │
           │ HTTP / API
           ▼
┌──────────────────────┐
│    FastAPI Backend   │
│                      │
│  Chat • Documents    │
│  Memory • Services   │
└───────┬───────┬──────┘
        │       │
        │       └───────────────┐
        ▼                       ▼
┌───────────────┐       ┌───────────────┐
│    Ollama     │       │    SQLite     │
│  Local LLMs   │       │ Conversation  │
│               │       │    Memory     │
└───────────────┘       └───────────────┘
        │
        │
        ▼
┌──────────────────────┐
│    Document RAG      │
│ PDF ingestion +      │
│ retrieval context    │
└──────────────────────┘
```

---

## Repository Structure

```text
nova-ai-workspace/
│
├── backend/        # FastAPI application and AI services
├── frontend/       # User-facing workspace
├── docs/           # Project documentation
├── .gitignore
├── LICENSE
└── README.md
```

The backend is organized so model/provider logic, routes, schemas, prompts, and services can evolve independently as the project grows.

---

## Core Engineering Areas

### 1. Local LLM Integration

Nova connects to locally running language models through **Ollama**, allowing development without depending entirely on hosted inference APIs.

This makes the project useful for experimenting with:

- local inference
- model-provider abstraction
- privacy-conscious AI workflows
- offline-friendly development

### 2. Document RAG

Nova supports PDF-based document workflows so uploaded information can be used as context during AI conversations.

The RAG pipeline is intended to separate:

```text
Document Upload
      ↓
Text Processing
      ↓
Retrieval
      ↓
Relevant Context
      ↓
LLM Response
```

This allows responses to be grounded in user-provided documents rather than relying only on the model's general knowledge.

### 3. Persistent Conversation Memory

Conversation state is persisted using **SQLite**, allowing Nova to retain chat history beyond an individual request.

This provides a foundation for more advanced memory features later.

### 4. Modular FastAPI Backend

The backend follows a modular structure rather than placing AI logic directly inside API routes.

The project separates concerns such as:

- API routes
- request/response schemas
- AI services
- model providers
- prompts
- configuration
- document handling
- persistence

This makes the codebase easier to extend and maintain.

---

## Running the Backend Locally

### Prerequisites

Make sure you have:

- Python 3.10+
- Git
- Ollama
- at least one Ollama model installed locally

### Clone the repository

```bash
git clone https://github.com/saudj40/nova-ai-workspace.git
cd nova-ai-workspace
```

### Create the backend environment

```powershell
cd backend

py -3.10 -m venv .venv
.\.venv\Scripts\Activate.ps1

python -m pip install --upgrade pip
pip install -r requirements.txt
```

### Start Ollama

Make sure Ollama is running and that the model configured by Nova is available.

For example:

```bash
ollama list
```

### Start the API

```bash
python -m uvicorn app.main:app --reload
```

The FastAPI development server should then be available locally.

Interactive API documentation:

```text
http://127.0.0.1:8000/docs
```

---

## Current Development Status

Nova is an **active personal AI engineering project**.

### Implemented

- [x] FastAPI backend
- [x] Local LLM integration
- [x] Chat API
- [x] Modular provider/service structure
- [x] Persistent conversation memory with SQLite
- [x] PDF upload
- [x] Document RAG
- [x] Frontend workspace structure

### Next

- [ ] Improve document retrieval quality
- [ ] Expand conversation and workspace memory
- [ ] Add richer source/citation handling
- [ ] Add tool-using AI workflows
- [ ] Experiment with agent-style orchestration
- [ ] Improve observability and error handling
- [ ] Add automated tests
- [ ] Prepare deployment workflow

---

## What This Project Demonstrates

Nova is primarily a learning-and-engineering project, but it reflects the areas I want to work in professionally:

- LLM application engineering
- Retrieval-Augmented Generation
- AI backend development
- REST API design
- local model integration
- persistence and memory
- full-stack AI products
- modular software architecture

---

## Author

**Muhammad Saud**  
AI / Machine Learning Engineer

- GitHub: [@saudj40](https://github.com/saudj40)
- LinkedIn: [linkedin.com/in/muhammadsaud111](https://www.linkedin.com/in/muhammadsaud111)

---

## License

This project is available under the [MIT License](LICENSE).
