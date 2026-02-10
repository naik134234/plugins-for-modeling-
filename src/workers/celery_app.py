from celery import Celery
from config import settings

celery_app = Celery(
    "risk_worker",
    broker=f"redis://:{settings.redis.password}@{settings.redis.host}:{settings.redis.port}/{settings.redis.db}" if settings.redis.password else f"redis://{settings.redis.host}:{settings.redis.port}/{settings.redis.db}",
    backend=f"redis://:{settings.redis.password}@{settings.redis.host}:{settings.redis.port}/{settings.redis.db}" if settings.redis.password else f"redis://{settings.redis.host}:{settings.redis.port}/{settings.redis.db}",
    include=["src.workers.tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_routes={
        "src.workers.tasks.calculate_var_task": {"queue": "risk_calculations"},
        "src.workers.tasks.run_monte_carlo_task": {"queue": "long_running_simulations"},
    },
)

if __name__ == "__main__":
    celery_app.start()
