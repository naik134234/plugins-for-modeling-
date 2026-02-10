from enum import Enum
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional
import yaml
from pydantic import Field
from pydantic_settings import BaseSettings


class Environment(str, Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    TEST = "test"


class DatabaseSettings(BaseSettings):
    """Database configuration settings."""
    
    host: str = Field(default="localhost", description="Database host")
    port: int = Field(default=5432, description="Database port")
    name: str = Field(default="risk_models", description="Database name")
    user: str = Field(default="postgres", description="Database user")
    password: str = Field(default="", description="Database password", env="DB_PASSWORD")
    pool_size: int = Field(default=10, description="Connection pool size")
    max_overflow: int = Field(default=20, description="Max overflow connections")
    echo: bool = Field(default=False, description="SQL echo mode")
    
    @property
    def url(self) -> str:
        """Get SQLAlchemy database URL."""
        return f"postgresql://{self.user}:{self.password}@{self.host}:{self.port}/{self.name}"
    
    @property
    def async_url(self) -> str:
        """Get async SQLAlchemy database URL."""
        return f"postgresql+asyncpg://{self.user}:{self.password}@{self.host}:{self.port}/{self.name}"


class RedisSettings(BaseSettings):
    """Redis configuration settings."""
    
    host: str = Field(default="localhost", description="Redis host")
    port: int = Field(default=6379, description="Redis port")
    db: int = Field(default=0, description="Redis database number")
    password: Optional[str] = Field(default=None, description="Redis password", env="REDIS_PASSWORD")
    max_connections: int = Field(default=50, description="Max connections")
    socket_timeout: int = Field(default=5, description="Socket timeout in seconds")
    socket_connect_timeout: int = Field(default=5, description="Connect timeout")


class SecuritySettings(BaseSettings):
    """Security configuration settings."""
    
    secret_key: str = Field(..., description="Secret key for JWT", env="SECRET_KEY")
    algorithm: str = Field(default="HS256", description="JWT algorithm")
    access_token_expire_minutes: int = Field(default=30, description="Token expiration")
    refresh_token_expire_days: int = Field(default=7, description="Refresh token expiration")
    password_min_length: int = Field(default=12, description="Minimum password length")
    password_require_uppercase: bool = Field(default=True)
    password_require_lowercase: bool = Field(default=True)
    password_require_numbers: bool = Field(default=True)
    password_require_special: bool = Field(default=True)
    max_failed_attempts: int = Field(default=5, description="Max login attempts before lockout")
    lockout_duration_minutes: int = Field(default=15, description="Account lockout duration")
    cors_origins: List[str] = Field(default_factory=list, description="Allowed CORS origins")
    cors_allow_credentials: bool = Field(default=True)


class RateLimitSettings(BaseSettings):
    """Rate limiting configuration."""
    
    default_requests_per_minute: int = Field(default=60, description="Default rate limit")
    default_requests_per_hour: int = Field(default=1000, description="Hourly rate limit")
    var_endpoint_rpm: int = Field(default=30, description="VaR endpoint rate limit")
    mc_endpoint_rpm: int = Field(default=10, description="Monte Carlo rate limit")
    burst_multiplier: int = Field(default=2, description="Burst allowance")


class MetricsSettings(BaseSettings):
    """Metrics and monitoring configuration."""
    
    enabled: bool = Field(default=True, description="Enable metrics")
    prometheus_port: int = Field(default=9090, description="Prometheus metrics port")
    log_request_metrics: bool = Field(default=True, description="Log request metrics")
    slow_request_threshold_ms: int = Field(default=1000, description="Slow request threshold")


class ComputeSettings(BaseSettings):
    """Compute resource configuration."""
    
    max_monte_carlo_simulations: int = Field(default=100000, description="Max simulation count")
    default_monte_carlo_simulations: int = Field(default=10000, description="Default simulation count")
    max_var_inputs: int = Field(default=10000, description="Max VaR input data points")
    default_var_confidence_levels: List[float] = Field(
        default_factory=lambda: [0.90, 0.95, 0.99],
        description="Default confidence levels"
    )
    computation_timeout_seconds: int = Field(default=300, description="Max computation time")
    worker_concurrency: int = Field(default=4, description="Worker concurrency")


class Settings(BaseSettings):
    """Main application settings."""
    
    environment: Environment = Field(default=Environment.DEVELOPMENT, description="Environment")
    debug: bool = Field(default=False, description="Debug mode")
    
    database: DatabaseSettings = Field(default_factory=DatabaseSettings)
    redis: RedisSettings = Field(default_factory=RedisSettings)
    security: SecuritySettings = Field(default_factory=SecuritySettings)
    rate_limit: RateLimitSettings = Field(default_factory=RateLimitSettings)
    metrics: MetricsSettings = Field(default_factory=MetricsSettings)
    compute: ComputeSettings = Field(default_factory=ComputeSettings)
    
    api_version: str = Field(default="v1", description="API version prefix")
    api_title: str = Field(default="Risk Modeling API", description="API title")
    api_description: str = Field(
        default="Enterprise-grade financial and risk modeling platform",
        description="API description"
    )
    
    # File paths
    logs_dir: Path = Field(default_factory=lambda: Path("logs"))
    temp_dir: Path = Field(default_factory=lambda: Path("/tmp/risk-models"))
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Get application settings with caching."""
    return Settings()


# Convenience function for accessing settings
settings = get_settings()
