import os
import ssl
from contextlib import closing

import pymysql
from pymysql.cursors import DictCursor


def _env_flag(name: str) -> bool:
    v = os.getenv(name, "").lower()
    return v in ("1", "true", "yes")


def get_connection():
    host = os.getenv("DB_HOST", "127.0.0.1")
    user = os.getenv("DB_USER", "root")
    password = os.getenv("DB_PASSWORD", "")
    database = os.getenv("DB_NAME", "lawfirm")
    port = int(os.getenv("DB_PORT", "3306"))

    kwargs: dict = {
        "host": host,
        "user": user,
        "password": password,
        "database": database,
        "port": port,
        "autocommit": True,
        "cursorclass": DictCursor,
        "connect_timeout": int(os.getenv("DB_CONNECT_TIMEOUT", "15")),
    }

    if _env_flag("DB_SSL"):
        ctx = ssl.create_default_context()
        if _env_flag("DB_SSL_INSECURE"):
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
        kwargs["ssl"] = ctx

    return pymysql.connect(**kwargs)


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
