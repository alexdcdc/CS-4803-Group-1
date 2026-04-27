from pydantic import BaseModel


class TransactionOut(BaseModel):
    id: str
    type: str
    amount: int
    label: str
    date: str


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    creditBalance: int
    transactions: list[TransactionOut]
    role: str
    hasCompletedOnboarding: bool


class SetRoleRequest(BaseModel):
    role: str


class LoginRequest(BaseModel):
    email: str
    password: str


class SignupRequest(BaseModel):
    name: str
    email: str
    password: str


class ForgotPasswordRequest(BaseModel):
    email: str


class UpdateAccountRequest(BaseModel):
    name: str | None = None
    email: str | None = None
    currentPassword: str | None = None
    newPassword: str | None = None


class DeleteAccountRequest(BaseModel):
    password: str
