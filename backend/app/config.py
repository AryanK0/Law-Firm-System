import os
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
VERCEL_TASK_ROOT = Path("/var/task")


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


def is_vercel_runtime():
    return any(os.getenv(name) for name in ("VERCEL", "VERCEL_ENV", "VERCEL_URL"))


def resolve_upload_dir():
    configured_dir = os.getenv("UPLOAD_DIR")

    if configured_dir:
        configured_path = Path(configured_dir).expanduser()
        temp_upload_name = configured_path.name or "uploads"
        if configured_path.is_absolute():
            resolved_path = configured_path.resolve()
        else:
            resolved_path = (REPO_ROOT / configured_path).resolve()

        if is_vercel_runtime():
            try:
                inside_task_bundle = resolved_path.is_relative_to(VERCEL_TASK_ROOT)
            except ValueError:
                inside_task_bundle = False

            if not configured_path.is_absolute() or inside_task_bundle:
                return (Path("/tmp") / temp_upload_name).resolve()

        return resolved_path

    if is_vercel_runtime():
        return Path("/tmp/uploads")

    return (REPO_ROOT / "uploads").resolve()


def ensure_upload_dir():
    upload_dir = resolve_upload_dir()
    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir
