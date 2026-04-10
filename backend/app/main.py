from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.chat import router as chat_router
from app.api.exams import router as exams_router
from app.api.health import router as health_router
from app.api.learning import router as learning_router
from app.api.mentorships import router as mentorships_router
from app.config import settings
from app.init_db import bootstrap_data, init_models


@asynccontextmanager
async def lifespan(_: FastAPI):
    await init_models()
    await bootstrap_data()
    yield


app = FastAPI(
    title="Doctor Mind API",
    description="EdTech médica — chat com RAG e provas simuladas.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(exams_router, prefix="/api")
app.include_router(learning_router, prefix="/api")
app.include_router(mentorships_router, prefix="/api")


@app.get("/")
async def root():
    return {"name": "Doctor Mind API", "docs": "/docs"}
