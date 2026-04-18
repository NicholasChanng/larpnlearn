from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    anthropic_api_key: str = ""
    openai_api_key: str = ""

    chroma_persist_dir: str = "./chroma_data"
    database_url: str = "sqlite:///./app.db"
    demo_course_dir: str = "../demo_course"

    cors_origins: str = "http://localhost:3000"
    jwt_secret: str = "dev-only-not-used-in-mvp"
    app_env: str = "development"

    anthropic_model: str = "claude-sonnet-4-5"
    anthropic_vision_model: str = "claude-haiku-4-5"
    embedding_model: str = "text-embedding-3-small"
    whisper_model: str = "whisper-1"

    retrieval_timeout_s: float = 5.0
    generation_timeout_s: float = 15.0

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def demo_course_path(self) -> Path:
        return Path(self.demo_course_dir).resolve()


settings = Settings()
