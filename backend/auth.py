import uuid
import time
from argon2 import PasswordHasher

ph = PasswordHasher(
    time_cost=2,       # Same as timeCost: 2
    memory_cost=19456, # Same as memoryCost: 19456
    hash_len=32,       # Same as outputLen: 32
    parallelism=1      # Same as parallelism: 1
)

from db.db import DB


# Function to create a new session
def create_session(db: DB, user_id, expires_in_seconds=3600):
    session_id = str(uuid.uuid4())  # Generate a new unique session ID
    expires_at = int(time.time()) + expires_in_seconds  # Set the expiration time
    
    db.execute('''
        INSERT INTO session (id, expires_at, user_id)
        VALUES (?, ?, ?)
    ''', (session_id, expires_at, user_id))
    return session_id

# Function to validate a session
def validate_session(db: DB, session_id):
    session_data= db.get('''
        SELECT * FROM session WHERE id = ?
    ''', (session_id,))

    if session_data and session_data['expires_at'] > int(time.time()):
        return session_data  # Session is valid
    return None  # Session is either not found or expired

# Function to delete an expired or invalid session
def delete_session(db: DB, session_id):
    db.execute('''
        DELETE FROM session WHERE id = ?
    ''', (session_id,))

# Function to check user credentials (for login)
def check_user_credentials(db: DB, username, password):
    user = db.get(query='''
        SELECT passwordHash, id FROM user WHERE username = ?
    ''', parameters=(username,))

    if user and ph.verify(user["passwordHash"], password=password):
        return user
    return None