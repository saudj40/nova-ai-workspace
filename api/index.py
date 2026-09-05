import sys
import traceback
from pathlib import Path

print("[NOVA] Starting Vercel function...")

BACKEND_DIR = (
    Path(__file__)
    .resolve()
    .parents[1]
    / "backend"
)

print(
    f"[NOVA] Backend directory: "
    f"{BACKEND_DIR}"
)

sys.path.insert(
    0,
    str(BACKEND_DIR),
)

print("[NOVA] Backend path added.")

try:
    print(
        "[NOVA] Importing app.main..."
    )

    from app.main import app

    print(
        "[NOVA] FastAPI import successful."
    )

except Exception:
    print(
        "[NOVA] FastAPI import FAILED."
    )

    traceback.print_exc()

    raise