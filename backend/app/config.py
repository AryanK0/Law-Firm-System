import os
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]


def _load_env_file(path: Path):
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


for candidate in (REPO_ROOT / ".env", REPO_ROOT / "backend" / ".env"):
    _load_env_file(candidate)


def get_env(*names: str, default: str | None = None):
    for name in names:
        value = os.getenv(name)
        if value not in (None, ""):
            return value
    return default
