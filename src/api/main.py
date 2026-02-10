from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import settings
from src.api.routes import auth, health, monte_carlo, var
from src.core.logging_config import setup_logging

# Setup logging
setup_logging(environment=settings.environment)

app = FastAPI(
    title=settings.api_title,
    description=settings.api_description,
    version=settings.api_version,
    openapi_url=f"/api/{settings.api_version}/openapi.json",
    docs_url=f"/api/{settings.api_version}/docs",
    redoc_url=f"/api/{settings.api_version}/redoc",
)

# Set all CORS enabled origins
if settings.security.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.security.cors_origins],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(auth.router, prefix=f"/api/{settings.api_version}/auth", tags=["Authentication"])
app.include_router(var.router, prefix=f"/api/{settings.api_version}/var", tags=["Value at Risk"])
app.include_router(monte_carlo.router, prefix=f"/api/{settings.api_version}/monte-carlo", tags=["Monte Carlo"])
app.include_router(health.router, tags=["Health"])
from src.api.routes import credit_risk
app.include_router(credit_risk.router, prefix=f"/api/{settings.api_version}/credit-risk", tags=["Credit Risk"])
from src.api.routes import sensitivity
app.include_router(sensitivity.router, prefix=f"/api/{settings.api_version}/sensitivity", tags=["Sensitivity Analysis"])
from src.api.routes import capital_budgeting
app.include_router(capital_budgeting.router, prefix=f"/api/{settings.api_version}/capital-budgeting", tags=["Capital Budgeting"])


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"message": "Internal Server Error", "detail": str(exc)},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.api.main:app", host="0.0.0.0", port=8000, reload=True)
