
download_query = """
CREATE TABLE IF NOT EXISTS download (
    id TEXT NOT NULL PRIMARY KEY UNIQUE,
    userId TEXT NOT NULL,
    dateStarted TEXT NOT NULL,
    dateEnded TEXT,
    downloadURL TEXT NOT NULL,
    status TEXT NOT NULL
)"""