from datetime import date, datetime
from functools import lru_cache
from zoneinfo import ZoneInfo

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuración de la aplicación, leída de variables de entorno o del archivo .env."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_NAME: str = "Xcellent Day API"
    ENVIRONMENT: str = "development"

    DATABASE_URL: str = "postgresql+psycopg://xcellent:xcellent@localhost:5432/xcellentday"

    # JWT (RF02 / RNF02): vigencia de 8 horas
    JWT_SECRET: str = "cambia-este-secreto-en-produccion"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 8 * 60

    # Bloqueo por intentos fallidos (RF02)
    MAX_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_MINUTES: int = 15

    # Zona horaria del negocio (Mérida)
    TIMEZONE: str = "America/Merida"

    # Umbrales de negocio
    PAYMENT_ALERT_DAYS: int = 7  # RF08
    REMINDER_WINDOW_DAYS: int = 3  # RF10

    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # Administrador inicial: se crea al arrancar si no existe ningún usuario
    FIRST_ADMIN_EMAIL: str = "admin@xcellentday.com"
    FIRST_ADMIN_PASSWORD: str = "Admin12345"
    FIRST_ADMIN_NAME: str = "Administrador"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def tz(self) -> ZoneInfo:
        return ZoneInfo(self.TIMEZONE)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()


def now() -> datetime:
    """Fecha y hora actual con zona horaria del negocio."""
    return datetime.now(settings.tz)


def today() -> date:
    """Fecha actual en la zona horaria del negocio."""
    return now().date()
