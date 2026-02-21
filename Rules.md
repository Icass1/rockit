create a claude.md file with the following information:

this is a music player called rockit.

this is project that uses nextjs to serve the frontend without any computation in the nextjs server. the frontend communicates directly with a fastapi server which communicates to a postgressql database using sqlalchemy orm async.

all the frontend is in the frontend directory and all the backend in the backend directory. 

inside the backend directory there are 5 businesses currently, core, default, spotify, youtube, and rockit.

THERE CAN'T BE ANYTHING OF ANY other business IN CORE.

not even a list of providers, nothing.

each business has 3 layers controller, framework and access. the controller only interacts with the framework and the framework only interacts with the access and the access only intereacts with the database. the controller never calls the access or the framework the database etc.

each business a similar file structure, this is an exmaple inside core of user and session stuff:
backend
  core
    access
      db
        ormModels
          user.py
          session.py
        ormEnums
        associationTables
        db.py (Imports all tables in ormModels and ormEnums)
        base.py (Contains the declarative_base)
    controller
      userController.py (Routes for the user like queue or session to get user information)
      authController.py (Routes like login register logout)
    enums
      repeatSongEnum.py (For the repeat song mode selected by the user)
    framework
      user
        user.py
      auth
        session.py
        register.py (register using password)
        password.py (login using password)
        google.py (TODO login using Google)
    middlewares
      authMiddleware.py (Used in router dependencies inside the controllers that need authentication)
    requests (clases that extend pydantic BaseModel that are used in ALL post endpoints as payload)
      loginRequest.py 
      registerRequest.py
    responses (clases that extend pydantic BaseModel that are always returned in all endpoints)
      sessionResponse.py
      okResponse.py (For a simple 200 with message OK)
    utils (general utils)
      

  
all files inside framework and access are static clases where all methods use @staticmethod.
all methods must contain a comment like this.

def function() -> str:
  """..."""


everything should be async.
everything is type strict.

every function must retrun a AResult like this, never raise an exception
fastapi HTTPException can only be raised in controller or middleware. 


to log things use from backend.utils.logger import getLogger and then do logger = getLogger(__main__) after the imports and before any class or endpoint definition. getLogger returns a logging.Logger class

Every AResult should be checked.

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode

logger = getLogger(__main__)

class ClassInsideFramework:
    @staticmethod
    async def function() -> AResult[str]:
        """..."""

        a_result_example_string_variable: AResult[str] = await method_that_returns_a_string()
        if a_result_example_string_variable.is_not_ok():
            logger.error(f"Error getting user from database. {a_result_example_string_variable.info()}")
            return AResult(code=AResultCode.GENERAL_ERROR, message=a_result_example_string_variable.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result_example_string_variable.result())

if you are using a value returned by an AResult many times you can do something like user: UserRow = a_result_user.result() after checking the ARresult

ALL VARIABLES SHOULD CONTAIN the type like number: int = 3, string: string or a_result_text: AResult[str]. all keyword function parameters should be passed. like AResult(code=AResultCode.OK, message="OK", result=a_result_example_string_variable.result()) not AResult(AResultCode.OK, "OK", a_result_example_string_variable.result())

the order of the imports is:

first external imports in order of length. the first one should be the shortest import and the last one should be the longest
space
then backend.utils
space
from backend.core.aResult import AResult, AResultCode
then backend.core.access
then backend.core.framework
then backend.core.middleware
space
then backend.core.responses
then backend.core.requests
space
if you are inside another business the same order as core but for that business.



table definitions inside ormModels and ormEnums are like ErrorRow(CoreBase, TableAutoincrementId, TableDateUpdated, TableDateAdded) for example.

all database names are snake_case, all tables are singular names, is user not users.

association tables are for example to connect a playlist row with many song rows, with a table called playlist_songs that contains a column for playlist id and another for song id