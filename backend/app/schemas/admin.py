from pydantic import BaseModel, EmailStr

class CreateBetaUserRequest(BaseModel):
    email: EmailStr
    password: str
    plan: str = "pro"

class CreateBetaUserResponse(BaseModel):
    email: str
    password: str
    plan: str
    login_url: str
