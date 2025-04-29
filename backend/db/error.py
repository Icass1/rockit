
error_query = """
CREATE TABLE IF NOT EXISTS error (
    id TEXT NOT NULL PRIMARY KEY UNIQUE,
    msg TEXT,
    source TEXT,
    lineNo INTEGER,
    columnNo INTEGER,
    errorMessage TEXT,
    errorCause TEXT,
    errorName TEXT,
    errorStack TEXT,
    dateAdded INTEGER,
    userId TEXT
)"""
