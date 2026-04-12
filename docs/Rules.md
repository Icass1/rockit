create claude.md file:

- music player called rockit
- nextjs frontend, fastapi backend, postgressql database with sqlalchemy orm async
- frontend in frontend/, backend in backend/
- 5 businesses: core, default, spotify, youtube, rockit

RULE: NOTHING from other business in core. Not even provider list.

Each business has 3 layers: controller, framework, access. Controller → framework → access → database. Controller NEVER calls access or database directly.

File structure (core example):

```
backend/
core/
access/
db/
ormModels/
user.py
session.py
ormEnums/
associationTables
db.py (imports all tables)
base.py (declarative_base)
controller/
userController.py (queue, session, user info)
authController.py (login, register, logout)
enums/
repeatSongEnum.py
framework/
user/
user.py
auth/
session.py
register.py
password.py
google.py (TODO)
middlewares/
authMiddleware.py (auth dependency)
requests/ (pydantic BaseModel for POST payload)
loginRequest.py
registerRequest.py
responses/ (pydantic BaseModel for endpoints)
sessionResponse.py
okResponse.py (200 OK message)
utils/
```

- all framework/access: static classes, @staticmethod
- every method: docstring like `"""..."""
- everything async
- everything type strict

- every function return AResult, NEVER raise exception
- HTTPException ONLY in controller or middleware

Log:

```python
from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode

logger = getLogger(__name__)

class ClassInsideFramework:
    @staticmethod
    async def function() -> AResult[str]:
        """..."""

        a_result = await method()
        if a_result.is_not_ok():
            logger.error(f"Error. {a_result.info()}")
            return AResult(code=AResultCode.GENERAL_ERROR, message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())
```

Check every AResult. Use result() after checking:

```python
user: UserRow = a_result_user.result()
```

ALL VARIABLES: type required. keyword args required.

Import order:

1. external (shortest → longest)
2. backend.utils
3. backend.core.aResult
4. backend.core.access
5. backend.core.framework
6. backend.core.middleware
7. backend.core.responses
8. backend.core.requests

Same order for other businesses.

ORM: `ErrorRow(CoreBase, TableAutoincrementId, TableDateUpdated, TableDateAdded)`

- table names: singular (user NOT users)
- columns: snake_case

Association tables: connect playlist_songs with playlist_id + song_id
