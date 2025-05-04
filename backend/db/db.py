

import os
import sqlite3
from typing import Any, List, Dict, Callable
import sys
import json
import re

import atexit
from threading import Lock
import inspect

from db.session import sesssion_query
from db.image import image_query, parse_image
from db.playlist import playlist_query, parse_playlist
from db.user import user_query, parse_user
from db.error import error_query
from db.download import download_query, parse_download
from db.album import album_query, parse_album
from db.song import song_query, parse_song

from logger import getLogger

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.dirname(os.path.abspath(__file__)))


DB_PATH = "database/database.db"
INSECURE_DB_MODE = os.getenv("INSECURE_DB_MODE", "false") == "true"

os.makedirs("database", exist_ok=True)


lock = Lock()


class Table:
    def __init__(self, db: "DB", query, parser: Callable | None = None):
        self.logger = getLogger(__name__, class_name="Table")

        self.db = db
        self.query = query
        self.parser = parser

        self.table_name = self.db.get_table_name(query)

        if not self.table_name:
            self.logger.critical(f"Unable to get table_name. query: {query}")
            return

        self.logger.info(f"Checking {self.table_name} table...")

        self.db.check_table(query)
        self.db.execute(query)
        self.columns = self.db.get_existing_columns(self.table_name)

    def get_columns_from_select(self, query: str):
        match = re.search(r"SELECT\s+(.*?)\s+FROM", query, re.IGNORECASE)
        if not match:
            return None

        columns_part = match.group(1).strip()

        # Handle wildcard case
        if columns_part == "*":
            return "*"

        # Split columns, handling possible spaces and backticks/quotes
        columns = re.split(r"\s*,\s*", columns_part)
        columns = [col.strip("`\"'") for col in columns]

        return columns

    def get_all(self, query: str, parameters=None):
        lock.acquire()
        if parameters:
            self.db.cur.execute(query, parameters)
        else:
            self.db.cur.execute(query)

        results = self.db.cur.fetchall()
        lock.release()

        columns = self.get_columns_from_select(query)

        if columns == "*":
            columns = [k.get("name") for k in self.columns]

        if not columns:
            return

        if self.parser:
            results = [self.parser(dict(zip(columns, result)))
                       for result in results]
        else:
            results = [dict(zip(columns, result)) for result in results]

        return results

    def get(self, query: str, parameters=None):
        lock.acquire()

        if parameters:
            self.db.cur.execute(query, parameters)
        else:
            self.db.cur.execute(query)

        result = self.db.cur.fetchmany(1)
        lock.release()

        if len(result) == 0:
            return None
        result = result[0]

        columns = self.get_columns_from_select(query)

        if columns == "*":
            columns = [k.get("name") for k in self.columns]

        if not columns:
            return

        if self.parser:
            result = self.parser(dict(zip(columns, result)))
        else:
            result = dict(zip(columns, result))
        return result


class DB:
    def __init__(self):
        self.conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        self.cur = self.conn.cursor()
        # Enable foreign key support
        self.conn.execute('PRAGMA foreign_keys = ON')

        self.logger = getLogger(__name__, class_name="DB")

        self.logger.info("Checking database tables...")
        self.tables = [
            Table(self, song_query, parser=parse_song),
            Table(self, album_query, parser=parse_album),
            Table(self, download_query, parse_download),
            Table(self, error_query),
            Table(self, user_query, parse_user),
            Table(self, playlist_query, parse_playlist),
            Table(self, image_query, parse_image),
            Table(self, sesssion_query),
        ]

        atexit.register(self.close)

    def close(self):
        self.logger.info("Closing database connection...")
        self.conn.close()
        self.logger.info("Done")

    def get_table_difference(self, list_a: List[Dict], list_b: List[Dict]):
        added_columns = []
        removed_columns = []
        modified_columns = []

        for col_a in list_a:
            col_b = next(
                (c for c in list_b if c['name'] == col_a['name']), None)
            if col_b is None:
                removed_columns.append(col_a['name'])
                continue
            for param in ['dflt_value', 'pk', 'type', 'notnull']:
                if col_a[param] != col_b[param]:
                    modified_columns.append({
                        'name': col_a['name'],
                        'param': param,
                        'previous': col_a[param],
                        'next': col_b[param]
                    })

        for col_b in list_b:
            if not any(col_a['name'] == col_b['name'] for col_a in list_a):
                added_columns.append(col_b['name'])

        return modified_columns, removed_columns, added_columns

    def get_table_columns(self, query: str):

        col_defs = query.split("(", 1)[1].rsplit(")", 1)[
            0].replace("\n", "").split(",")

        new_columns = []
        for idx, col in enumerate(col_defs):
            parts = col.strip().split()
            name, col_type = parts[0], parts[1]
            new_columns.append({
                'cid': idx,
                'name': name,
                'type': col_type,
                'notnull': int("NOT NULL" in col),
                'dflt_value': parts[parts.index("DEFAULT") + 1] if "DEFAULT" in parts else None,
                'pk': int("PRIMARY KEY" in col)
            })

        return new_columns

    def get_table(self, table_name):
        for k in self.tables:
            if k.table_name == table_name:
                return k

    def get_existing_columns(self, table_name: str):
        self.cur.execute(f"PRAGMA table_info({table_name})")
        existing_columns = [dict(zip(
            [col[0] for col in self.cur.description], row)) for row in self.cur.fetchall()]

        return existing_columns

    def get_table_name(self, query: str) -> str | None:
        match = re.search(
            r"\b(?:FROM|INTO|TABLE(?: IF NOT EXISTS)?|JOIN)\s+([`\"']?)(\w+)\1", query, re.IGNORECASE)

        result = match.group(2) if match else None
        return result

    def check_table(self, query: str):

        table_name = self.get_table_name(query)

        if not table_name:
            return

        existing_columns = self.get_existing_columns(table_name)

        if not existing_columns:
            self.logger.warning(f"Table {table_name} does not exist.")
            return

        new_columns = self.get_table_columns(query=query)

        modified_columns, removed_columns, added_columns = self.get_table_difference(
            existing_columns, new_columns)

        if modified_columns:
            self.logger.warning(
                f"Detected column modifications: {modified_columns}")
            if INSECURE_DB_MODE:
                self.logger.warning("Applying column changes...")
                column_names = ", ".join(col['name'] for col in new_columns)
                self.cur.execute(
                    f"CREATE TABLE temp_{table_name} AS SELECT {column_names} FROM {table_name}")
                self.cur.execute(f"DROP TABLE {table_name}")
                self.cur.execute(
                    f"ALTER TABLE temp_{table_name} RENAME TO {table_name}")
                self.conn.commit()

        if removed_columns and INSECURE_DB_MODE:
            self.logger.warning(f"Removing columns: {removed_columns}")
            for column in removed_columns:
                self.cur.execute(
                    f"ALTER TABLE {table_name} DROP COLUMN {column}")
            self.conn.commit()

        if added_columns:
            self.logger.warning(f"Adding new columns: {added_columns}")
            for column in added_columns:
                new_col = next(
                    (c for c in new_columns if c['name'] == column), None)
                if new_col:
                    query = f"ALTER TABLE {table_name} ADD COLUMN {new_col['name']} {new_col['type']}"
                    if new_col['dflt_value']:
                        query += f" DEFAULT {new_col['dflt_value']}"
                    if new_col['notnull']:
                        query += " NOT NULL"
                    self.cur.execute(query)
            self.conn.commit()

    def execute(self, query: str, parameters=None):
        lock.acquire()
        if parameters:
            self.cur.execute(query, parameters)
        else:
            self.cur.execute(query)

        self.conn.commit()
        lock.release()

    def get_all(self, query: str, parameters=None):

        table_name = self.get_table_name(query)
        table = self.get_table(table_name)

        if not table:
            self.logger.error(f"Table '{table_name}' not found")
            return

        return table.get_all(query, parameters)

    def get(self, query: str, parameters=None) -> Any:
        table_name = self.get_table_name(query=query)
        table = self.get_table(table_name=table_name)

        if not table:
            self.logger.error(f"Table '{table_name}' not found")
            return

        return table.get(query, parameters)


def main():

    db = DB()

    image = db.get("SELECT * FROM song WHERE id = '5gLJZBGkpvRXWbEbTcLIz8'")
    print(json.dumps(image, indent=4))

    return

    playlist = db.get("SELECT * FROM playlist LIMIT 1")
    print(json.dumps(playlist, indent=4))

    user = db.get("SELECT * FROM user LIMIT 1")
    print(json.dumps(user, indent=4))

    error = db.get("SELECT * FROM error LIMIT 1")
    print(json.dumps(error, indent=4))

    for song in db.get_all("SELECT * FROM song LIMIT 2"):
        print(song["name"], song.get("artists")[0].get("name"))

    album = db.get("SELECT id,songs FROM album LIMIT 1")
    print(album["id"], album["songs"])

    download = db.get("SELECT * FROM download LIMIT 1")
    print(json.dumps(download, indent=4))


if __name__ == "__main__":
    main()
