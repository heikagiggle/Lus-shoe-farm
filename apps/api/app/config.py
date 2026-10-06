from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://lsf:lsf@localhost:5432/lsf"
    jwt_secret: str = "change-me"
    jwt_expire_minutes: int = 60 * 12
    cors_origins: str = "http://localhost:3000"
    admin_email: str = "str"
    admin_password: str = "str"

    supabase_url: str
    supabase_service_role_key: str
    supabase_bucket: str = "uploads"


    paystack_secret_key: str = "sk_test_placeholder"
    paystack_mock: bool = True  # MUST be false in production
    paystack_base_url: str = "https://api.paystack.co"

    resend_api_key: str = ""  # preferred: sends over HTTPS (works where SMTP ports are blocked)
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    mail_from: str = "orders@lushoefarm.com"

    otp_ttl_minutes: int = 10
    otp_resend_seconds: int = 30
    otp_max_per_15min: int = 5
    otp_max_attempts: int = 5

    # vat_rate: float = 0.075
    vat_rate: float = 0
    free_shipping_threshold: int = 200_000
    flexible_fee: int = 4_750
    priority_fee: int = 7_000
    pickup_address: str = "Lu's Shoe Farm Store, shop 32 Balogun, Lagos Island, Lagos"


settings = Settings()
