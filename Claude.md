# rockit - Architecture Overview

This is a **music player called Rockit**.

This project uses **Next.js** to serve the frontend **without any computation** in the Next.js server.

The frontend communicates **directly with a FastAPI backend**, and the FastAPI server communicates with a **PostgreSQL database** using **SQLAlchemy ORM (async)**.

---

## Directory Structure

```
frontend/   → all frontend code
backend/    → all backend code
```

Inside the `backend` directory there are **five businesses**:

* **core**
* **default**
* **spotify**
* **youtube**
* **rockit**

### ❗ Critical Rule About Core

**There cannot be anything from any other business inside `core`.**
No providers, no references, nothing.

---

## Business Structure

Each business has **3 layers**:

* **controller** → only interacts with **framework**
* **framework** → only interacts with **access**
* **access** → only interacts with **database**

Rules:

* The **controller never calls access** or database directly.
* The **framework never calls controller**.
* The **access layer never calls framework**.

---

## Example Structure (from core)

```
backend
  core
    access
      db
        ormModels
          user.py
          session.py
        ormEnums
        associationTables
        db.py            # imports all tables in ormModels and ormEnums
        base.py          # contains declarative_base

    controller
      userController.py  # routes for user and session info
      authController.py  # login, register, logout

    enums
      repeatSongEnum.py

    framework
      user/
        user.py
      auth/
        session.py
        register.py
        password.py
        google.py (TODO)

    middlewares
      authMiddleware.py

    requests
      loginRequest.py
      registerRequest.py

    responses
      sessionResponse.py
      okResponse.py

    utils
```

---

## Coding Rules

### Static Classes

All files in **framework** and **access** contain **static classes**.
All methods use `@staticmethod`.
Each method must contain a docstring:

```python
def function() -> str:
    """..."""
```

### Everything is async

All functions must be async.

### Strict typing

All variables must include types:

```
number: int = 3
text: str = "hello"
a_result_text: AResult[str]
```

### Use AResult (never raise exceptions)

All functions must return **AResult**, never raise exceptions internally.
Only **controllers and middleware** may raise `HTTPException`.

### Logging

```python
from backend.utils.logger import getLogger
logger = getLogger(__main__)
```

### Checking AResult

Example:

```python
from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode

logger = getLogger(__main__)

class Example:
    @staticmethod
    async def function() -> AResult[str]:
        """..."""

        a_result_example_string_variable: AResult[str] = await method_that_returns_a_string()
        if a_result_example_string_variable.is_not_ok():
            logger.error(f"Error getting user from database. {a_result_example_string_variable.info()}")
            return AResult(code=AResultCode.GENERAL_ERROR, message=a_result_example_string_variable.message())

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=a_result_example_string_variable.result()
        )
```

If you use the result multiple times:

```
user: UserRow = a_result_user.result()
```

### Keyword arguments required

Always write:

```
AResult(code=AResultCode.OK, message="OK", result="text")
```

Not:

```
AResult(AResultCode.OK, "OK", "text")
```

---

## Import Order

1. External imports (shortest → longest)

2. `backend.utils`

3. `from backend.core.aResult import AResult, AResultCode`

4. `backend.core.access`

5. `backend.core.framework`

6. `backend.core.middleware`

7. `backend.core.responses`

8. `backend.core.requests`

For another business, use the equivalent order under that business.

---

## Database Rules

### ORM Models and Enums

Table definitions look like:

```
class ErrorRow(CoreBase, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    ...
```

### Naming conventions

* Database names → **snake_case**
* Table names → **singular** (`user`, not `users`)

### Association tables

Example: playlists ↔ songs

```
playlist_songs
  playlist_id
  song_id
```

Used for many-to-many relations.

---

This file defines the full technical rules and architecture constraints for the **Rockit music player backend and frontend structure**.
