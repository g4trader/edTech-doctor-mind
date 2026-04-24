from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = (
        "postgresql+asyncpg://doctor:doctor@localhost:5432/doctor_mind"
    )
    cors_origins: str = "http://localhost:3000"
    cors_origin_regex: str | None = None
    cors_allow_credentials: bool = False

    auto_init_db: bool = True
    auto_seed_demo_data: bool = True

    ai_backend: str = "auto"
    hf_token: str | None = None
    hf_chat_model: str = "meta-llama/Llama-3.1-8B-Instruct:cerebras"
    hf_embed_model: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"

    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_chat_model: str = "llama3.2"
    ollama_embed_model: str = "nomic-embed-text"

    rag_top_k: int = 4
    rag_min_similarity: float = 0.25

    @field_validator("cors_origin_regex", mode="before")
    @classmethod
    def empty_regex_as_none(cls, value: str | None) -> str | None:
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def resolved_ai_backend(self) -> str:
        backend = self.ai_backend.strip().lower()
        if backend == "auto":
            return "huggingface" if self.hf_token else "ollama"
        return backend


settings = Settings()
