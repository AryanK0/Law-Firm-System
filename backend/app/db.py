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
        if "://" not in database_url:
            database_url = "mysql://" + database_url
        parsed = urlparse(database_url)
        if parsed.scheme not in {"mysql", "mysql2", "mysql+pymysql", "mysql+aiomysql", "mysql+asyncmy"}:
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
        "host": get_env("DB_HOST", "MYSQL_HOST", "MYSQLHOST", default="localhost"),
        "user": get_env("DB_USER", "MYSQL_USER", "MYSQLUSER", default="root"),
        "password": get_env("DB_PASSWORD", "MYSQL_PASSWORD", "MYSQLPASSWORD", default=""),
        "database": get_env("DB_NAME", "MYSQL_DATABASE", "MYSQLDATABASE", default="lawfirm"),
        "port": _parse_port(get_env("DB_PORT", "MYSQL_PORT", "MYSQLPORT", default="3306")),
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


import threading

_pool_lock = threading.Lock()
_connection_pool = []
_MAX_POOL_SIZE = 10


def get_connection():
    config = _connection_config()
    config.pop("_source", None)

    with _pool_lock:
        while _connection_pool:
            conn = _connection_pool.pop()
            try:
                conn.ping(reconnect=False)
                return conn
            except Exception:
                try:
                    conn.close()
                except Exception:
                    pass

    return pymysql.connect(**config)


def release_connection(conn, discard: bool = False):
    if not conn:
        return
    if discard:
        try:
            conn.close()
        except Exception:
            pass
        return

    try:
        conn.rollback()
    except Exception:
        try:
            conn.close()
        except Exception:
            pass
        return

    with _pool_lock:
        if len(_connection_pool) < _MAX_POOL_SIZE:
            _connection_pool.append(conn)
        else:
            try:
                conn.close()
            except Exception:
                pass


def fetch_all(query, params=None):
    conn = get_connection()
    success = False
    try:
        with conn.cursor() as cursor:
            cursor.execute(query, params or ())
            rows = cursor.fetchall()
            success = True
            return rows
    finally:
        release_connection(conn, discard=not success)


def fetch_one(query, params=None):
    rows = fetch_all(query, params)
    return rows[0] if rows else None


def execute(query, params=None):
    conn = get_connection()
    success = False
    try:
        with conn.cursor() as cursor:
            cursor.execute(query, params or ())
            row_id = cursor.lastrowid
            success = True
            return row_id
    finally:
        release_connection(conn, discard=not success)


def call_procedure(name, params=None):
    conn = get_connection()
    success = False
    try:
        with conn.cursor() as cursor:
            cursor.callproc(name, params or ())

            result_sets = []
            while True:
                result_sets.append(cursor.fetchall())
                if not cursor.nextset():
                    break

            success = True
            return result_sets
    finally:
        release_connection(conn, discard=not success)


def call_procedure_one(name, params=None):
    for result_set in call_procedure(name, params):
        if result_set:
            return result_set[0]
    return None

