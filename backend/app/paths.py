import os
from pathlib import Path


def upload_dir() -> Path:
    raw = os.getenv("UPLOAD_DIR")
    if raw:
        p = Path(raw)
    else:
        p = Path(__file__).resolve().parents[2] / "uploads"
    p.mkdir(parents=True, exist_ok=True)
    return p
