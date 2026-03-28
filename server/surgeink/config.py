from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="SURGEINK_",
        env_file=".env",
        extra="ignore",
    )

    env: str = "development"
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    # Redis (uses SURGEINK_REDIS_URL or defaults)
    redis_url: str = "redis://redis:6379/0"

    # External data source base URLs
    nominatim_base_url: str = "https://nominatim.openstreetmap.org"
    openmeteo_base_url: str = "https://flood-api.open-meteo.com"
    fema_nfhl_base_url: str = "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer"
    openfema_base_url: str = "https://www.fema.gov/api/open/v2"

    # CORS
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:7200",
    ]


settings = Settings()
