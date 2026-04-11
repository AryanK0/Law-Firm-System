import os
from contextlib import closing

import pymysql
from pymysql.cursors import DictCursor


def get_connection():
    return pymysql.connect(
        host=os.getenv("DB_HOST", "localhost"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", "Ar@230806."),
        database=os.getenv("DB_NAME", "lawfirm"),
        port=int(os.getenv("DB_PORT", "3306")),
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
