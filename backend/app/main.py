from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, feed, projects, stripe_webhooks, users, wallet

app = FastAPI(title="Quickstarter API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(projects.router, prefix="/api/v1/projects", tags=["projects"])
app.include_router(wallet.router, prefix="/api/v1/wallet", tags=["wallet"])
app.include_router(feed.router, prefix="/api/v1/feed", tags=["feed"])
app.include_router(stripe_webhooks.router, prefix="/api/v1/stripe", tags=["stripe"])


@app.get("/api/v1/health")
async def health():
    return {"status": "ok"}
