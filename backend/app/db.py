from contextlib import closing
from urllib.parse import unquote, urlparse

import pymysql
from pymysql.cursors import DictCursor

from .config import get_env


def _parse_port(raw_port):
    try:
        return int(raw_port or "3306")
    except (TypeError, ValueError) as exc:
        raise RuntimeError(f"Invalid database port value: {raw_port!r}") from exc


def _connection_config():
    database_url = get_env("MYSQL_URL", "MYSQL_PUBLIC_URL", "DATABASE_URL")
    if database_url:
        parsed = urlparse(database_url)
        if parsed.scheme not in {"mysql", "mysql2"}:
            raise RuntimeError(
                f"Unsupported database URL scheme: {parsed.scheme or 'missing'}"
            )

        return {
            "host": parsed.hostname or "localhost",
            "user": unquote(parsed.username or ""),
            "password": unquote(parsed.password or ""),
            "database": unquote(parsed.path.lstrip("/")) or "lawfirm",
            "port": parsed.port or 3306,
            "autocommit": True,
            "cursorclass": DictCursor,
            "connect_timeout": 10,
            "_source": "database_url",
        }

    return {
        "host": get_env("DB_HOST", "MYSQLHOST", default="localhost"),
        "user": get_env("DB_USER", "MYSQLUSER", default="root"),
        "password": get_env("DB_PASSWORD", "MYSQLPASSWORD", default=""),
        "database": get_env("DB_NAME", "MYSQLDATABASE", default="lawfirm"),
        "port": _parse_port(get_env("DB_PORT", "MYSQLPORT", default="3306")),
        "autocommit": True,
        "cursorclass": DictCursor,
        "connect_timeout": 10,
        "_source": "env_vars",
    }


def get_connection_info():
    config = _connection_config()
    return {
        "host": config["host"],
        "port": config["port"],
        "database": config["database"],
        "user": config["user"],
        "source": config["_source"],
    }


def get_connection():
    config = _connection_config()
    config.pop("_source", None)
    return pymysql.connect(**config)


def fetch_all(query, params=None):
    with closing(get_connection()) as connection:
        with connection.cursor() as cursor:
            cursor.execute(query, params or ())
            return cursor.fetchall()


def fetch_one(query, params=None):
    rows = fetch_all(query, params)
    return rows[0] if rows else None


def execute(query, params=None):
    with closing(get_connection()) as connection:
        with connection.cursor() as cursor:
            cursor.execute(query, params or ())
            return cursor.lastrowid


def call_procedure(name, params=None):
    with closing(get_connection()) as connection:
        with connection.cursor() as cursor:
            cursor.callproc(name, params or ())

            result_sets = []
            while True:
                result_sets.append(cursor.fetchall())
                if not cursor.nextset():
                    break

            return result_sets


def call_procedure_one(name, params=None):
    for result_set in call_procedure(name, params):
        if result_set:
            return result_set[0]
    return None
