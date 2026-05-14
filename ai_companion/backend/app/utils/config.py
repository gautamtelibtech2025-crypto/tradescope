from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "AI Companion Backend"
    app_env: str = "development"
    host: str = "0.0.0.0"
    port: int = 8000

    database_url: str = "postgresql://postgres:postgres@localhost:5432/ai_companion"
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    openai_chat_model: str = "gpt-4o-mini"
    openai_whisper_model: str = "whisper-1"
    anthropic_api_key: str = ""
    gemini_api_key: str = ""

    elevenlabs_api_key: str = ""
    elevenlabs_voice_id: str = "EXAVITQu4vr4xnSDxMaL"


settings = Settings()

