from contextlib import closing

import pymysql
from pymysql.cursors import DictCursor

from .config import get_env


def get_connection():
    return pymysql.connect(
        host=get_env("DB_HOST", "MYSQLHOST", default="localhost"),
        user=get_env("DB_USER", "MYSQLUSER", default="root"),
        password=get_env("DB_PASSWORD", "MYSQLPASSWORD", default=""),
        database=get_env("DB_NAME", "MYSQLDATABASE", default="lawfirm"),
        port=int(get_env("DB_PORT", "MYSQLPORT", default="3306") or "3306"),
        autocommit=True,
        cursorclass=DictCursor,
    )


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
