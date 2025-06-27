# FastAPI Best Practices

## URL Structure and Trailing Slashes

### The Trailing Slash Problem

FastAPI, by default, treats routes with and without trailing slashes as different endpoints. This can lead to issues like the 307 Temporary Redirect we encountered:

- When defining a route as `@router.post("/")`, FastAPI expects requests to `/endpoint/`
- When clients call `/endpoint` (without slash), FastAPI redirects to `/endpoint/` with a 307 Temporary Redirect
- For POST requests, this redirect can cause issues with CORS and data handling

### Best Practices for URL Structure

1. **Be Consistent**: Choose one style (with or without trailing slashes) and stick to it throughout your API
   ```python
   # Good: Consistent style without trailing slashes
   @router.get("/users")
   @router.get("/users/{user_id}")
   
   # Bad: Inconsistent style
   @router.get("/users/")
   @router.get("/users/{user_id}")
   ```

2. **Disable Automatic Redirects**: Configure FastAPI to not redirect between slash and non-slash URLs
   ```python
   app = FastAPI(redirect_slashes=False)
   ```

3. **Match Frontend and Backend**: Ensure your frontend API calls match the exact URL structure defined in your backend

## Project Structure

### Recommended Project Structure

```
fastapi_backend/
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI app initialization
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py            # Configuration settings
│   │   ├── security.py          # Authentication and security
│   │   └── dependencies.py      # Shared dependencies
│   ├── api/
│   │   ├── __init__.py
│   │   ├── api.py               # API router aggregation
│   │   └── routes/              # API endpoints by resource
│   │       ├── __init__.py
│   │       ├── users.py
│   │       └── items.py
│   ├── models/                  # SQLAlchemy models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   └── item.py
│   ├── schemas/                 # Pydantic schemas
│   │   ├── __init__.py
│   │   ├── user.py
│   │   └── item.py
│   ├── crud/                    # CRUD operations
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── user.py
│   │   └── item.py
│   ├── db/                      # Database setup
│   │   ├── __init__.py
│   │   ├── base.py
│   │   └── session.py
│   └── utils/                   # Utility functions
│       ├── __init__.py
│       └── utils.py
├── tests/                       # Tests
├── alembic/                     # Database migrations
├── .env                         # Environment variables
└── requirements.txt             # Dependencies
```

## Performance Optimization

### Database Optimization

1. **Use Async Database Connections**:
   ```python
   from databases import Database
   
   database = Database(DATABASE_URL)
   
   @app.on_event("startup")
   async def startup():
       await database.connect()
   
   @app.on_event("shutdown")
   async def shutdown():
       await database.disconnect()
   ```

2. **Implement Connection Pooling**:
   ```python
   from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
   
   engine = create_async_engine(
       DATABASE_URL, 
       pool_size=20,
       max_overflow=0
   )
   ```

3. **Use Bulk Operations**:
   ```python
   # Instead of multiple individual inserts
   db.bulk_insert_mappings(User, [user_dict1, user_dict2, user_dict3])
   db.commit()
   ```

### API Optimization

1. **Use Async/Await**:
   ```python
   @router.get("/items/")
   async def read_items():
       return await get_items_from_db()
   ```

2. **Implement Caching**:
   ```python
   from fastapi_cache import FastAPICache
   from fastapi_cache.backends.redis import RedisBackend
   from fastapi_cache.decorator import cache
   
   @router.get("/items/")
   @cache(expire=60)
   async def read_items():
       # This result will be cached for 60 seconds
       return await get_items_from_db()
   ```

3. **Use Background Tasks**:
   ```python
   from fastapi import BackgroundTasks
   
   @router.post("/send-notification/")
   async def send_notification(background_tasks: BackgroundTasks):
       background_tasks.add_task(send_email_notification)
       return {"message": "Notification will be sent in the background"}
   ```

## API Design Standards

### RESTful API Design

1. **Use Plural Nouns for Resources**:
   ```python
   @router.get("/users")         # Get all users
   @router.get("/users/{id}")    # Get a specific user
   @router.post("/users")        # Create a user
   @router.put("/users/{id}")    # Update a user
   @router.delete("/users/{id}") # Delete a user
   ```

2. **Use HTTP Methods Correctly**:
   - GET: Retrieve resources
   - POST: Create resources
   - PUT: Update resources (full update)
   - PATCH: Partial update of resources
   - DELETE: Remove resources

3. **Use Proper Status Codes**:
   - 200: OK
   - 201: Created
   - 204: No Content
   - 400: Bad Request
   - 401: Unauthorized
   - 403: Forbidden
   - 404: Not Found
   - 500: Internal Server Error

### Request Validation

1. **Use Pydantic Models for Validation**:
   ```python
   from pydantic import BaseModel, Field, EmailStr
   
   class UserCreate(BaseModel):
       username: str = Field(..., min_length=3, max_length=50)
       email: EmailStr
       password: str = Field(..., min_length=8)
   
   @router.post("/users/")
   async def create_user(user: UserCreate):
       # Data is already validated
       return await create_user_in_db(user)
   ```

2. **Implement Custom Validators**:
   ```python
   from pydantic import BaseModel, validator
   
   class UserCreate(BaseModel):
       username: str
       password: str
       password_confirm: str
       
       @validator('password_confirm')
       def passwords_match(cls, v, values):
           if 'password' in values and v != values['password']:
               raise ValueError('passwords do not match')
           return v
   ```

## Error Handling

1. **Use Custom Exception Handlers**:
   ```python
   from fastapi import FastAPI, Request, status
   from fastapi.responses import JSONResponse
   
   app = FastAPI()
   
   class CustomException(Exception):
       def __init__(self, name: str):
           self.name = name
   
   @app.exception_handler(CustomException)
   async def custom_exception_handler(request: Request, exc: CustomException):
       return JSONResponse(
           status_code=status.HTTP_400_BAD_REQUEST,
           content={"message": f"Error with {exc.name}"},
       )
   ```

2. **Consistent Error Response Format**:
   ```python
   from fastapi import HTTPException, status
   
   @router.get("/items/{item_id}")
   async def read_item(item_id: int):
       item = await get_item(item_id)
       if not item:
           raise HTTPException(
               status_code=status.HTTP_404_NOT_FOUND,
               detail={
                   "message": "Item not found",
                   "item_id": item_id,
                   "code": "ITEM_NOT_FOUND"
               }
           )
       return item
   ```

## Authentication and Security

1. **Use OAuth2 with Password Flow and JWT**:
   ```python
   from fastapi import Depends, FastAPI, HTTPException, status
   from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
   from jose import JWTError, jwt
   
   oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
   
   async def get_current_user(token: str = Depends(oauth2_scheme)):
       credentials_exception = HTTPException(
           status_code=status.HTTP_401_UNAUTHORIZED,
           detail="Could not validate credentials",
           headers={"WWW-Authenticate": "Bearer"},
       )
       try:
           payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
           username: str = payload.get("sub")
           if username is None:
               raise credentials_exception
       except JWTError:
           raise credentials_exception
       user = get_user(username)
       if user is None:
           raise credentials_exception
       return user
   ```

2. **Rate Limiting**:
   ```python
   from slowapi import Limiter
   from slowapi.util import get_remote_address
   
   limiter = Limiter(key_func=get_remote_address)
   
   @router.get("/items/")
   @limiter.limit("5/minute")
   async def read_items():
       return await get_items_from_db()
   ```

## Testing

1. **Use TestClient for API Testing**:
   ```python
   from fastapi.testclient import TestClient
   from app.main import app
   
   client = TestClient(app)
   
   def test_read_main():
       response = client.get("/")
       assert response.status_code == 200
       assert response.json() == {"message": "Hello World"}
   ```

2. **Use Pytest Fixtures for Database Testing**:
   ```python
   import pytest
   from sqlalchemy import create_engine
   from sqlalchemy.orm import sessionmaker
   
   from app.db.base import Base
   from app.main import app, get_db
   
   SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
   
   @pytest.fixture
   def db_session():
       engine = create_engine(SQLALCHEMY_DATABASE_URL)
       TestingSessionLocal = sessionmaker(bind=engine)
       Base.metadata.create_all(bind=engine)
       db = TestingSessionLocal()
       try:
           yield db
       finally:
           db.close()
           Base.metadata.drop_all(bind=engine)
   
   @pytest.fixture
   def client(db_session):
       def override_get_db():
           try:
               yield db_session
           finally:
               pass
       app.dependency_overrides[get_db] = override_get_db
       with TestClient(app) as c:
           yield c
   ```

## Documentation

1. **Use OpenAPI and Swagger UI**:
   ```python
   from fastapi import FastAPI
   
   app = FastAPI(
       title="My API",
       description="API description",
       version="0.1.0",
       docs_url="/docs",
       redoc_url="/redoc",
   )
   ```

2. **Document Endpoints with Docstrings**:
   ```python
   @router.get("/users/{user_id}", response_model=UserResponse)
   async def get_user(user_id: int):
       """
       Get a user by ID.
       
       Parameters:
       - **user_id**: The ID of the user to retrieve
       
       Returns:
       - **UserResponse**: The user data
       """
       return await get_user_from_db(user_id)
   ```

## Conclusion

By following these best practices, you can build a FastAPI application that is:
- Well-structured and maintainable
- High-performing and scalable
- Secure and robust
- Well-documented and easy to use

Remember that consistency in your API design (including URL structure) is key to avoiding issues like the trailing slash problem we encountered.
