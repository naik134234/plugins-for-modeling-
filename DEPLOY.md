# Production Deployment Guide

This guide outlines the steps to deploy the Risk Modeling Platform to a production environment.

## 1. Environment Configuration

### Environment Variables (.env)
Create a `.env` file in the root directory (or inject via your CI/CD pipeline).

| Variable | Description | Production Value |
|----------|-------------|------------------|
| `ENVIRONMENT` | Run mode | `production` |
| `DEBUG` | Enable debug logs/tracebacks | `false` |
| `SECRET_KEY` | JWT signing key | **Strong, random 64+ char string** |
| `DB_PASSWORD` | Database password | **Strong password** |
| `REDIS_PASSWORD` | Redis password | **Strong password** |
| `CORS_ORIGINS` | Allowed frontend domains | e.g. `https://app.yourdomain.com` |

**Example Production .env:**
```bash
ENVIRONMENT=production
DEBUG=false
SECRET_KEY=z7Xy9... # generate with openssl rand -hex 32
DB_PASSWORD=SecureDbPass123!
REDIS_PASSWORD=SecureRedisPass123!
POSTGRES_USER=risk_user
POSTGRES_DB=risk_production
```

## 2. Infrastructure Setup (Docker)

Use the provided `docker-compose.yml` for orchestration. In production, you might want to split services or use Kubernetes, but for single-node deployments:

1.  **Pull/Build Images:**
    ```bash
    docker-compose -f docker-compose.yml build
    ```

2.  **Start Services:**
    ```bash
    docker-compose -f docker-compose.yml up -d
    ```

3.  **Run Migrations:**
    Wait for the database to be healthy, then apply schema changes:
    ```bash
    docker-compose exec api alembic upgrade head
    ```

## 3. Worker Configuration

The Celery worker processes long-running Monte Carlo simulations.

-   **Concurrency**: Adjust `--concurrency` in the Dockerfile or command override based on CPU cores.
-   **Monitoring**: Use Flower (optional) or checking logs `docker-compose logs -f worker`.

## 4. Frontend Deployment

### Excel Add-in (Static Hosting)
1.  **Build**:
    ```bash
    cd excel-addin
    npm run build
    ```
    This generates a `dist/` folder.
2.  **Host**: Deploy the contents of `dist/` to a static host (e.g., S3 + CloudFront, Vercel, Netlify).
3.  **Manifest Update**:
    -   Update `manifest.xml`: Change `https://localhost:3000` to your production URL (e.g., `https://addin.risk-platform.com`).
    -   Host the updated `manifest.xml` alongside your static files or distribute via Microsoft 365 Admin Center.

### Google Sheets Add-on
1.  **Deploy**: Push code via `clasp` or copy-paste into Apps Script editor.
2.  **Config**: Update `API_BASE_URL` in `Code.gs` to point to your production API (e.g., `https://api.risk-platform.com/api/v1`).
3.  **Publish**: Deploy as a Google Workspace Add-on or Test Deployment.

## 5. Security Checklist

-   [ ] **HTTPS**: Ensure your API is served over HTTPS (use Nginx or Traefik as reverse proxy).
-   [ ] **Firewall**: Restrict access to DB (5432) and Redis (6379) ports to internal network only.
-   [ ] **Rate Limiting**: The API has built-in rate limiting (Redis-backed). Adjust limits in `src/core/config.py` if needed.
-   [ ] **Secrets**: Rotate `SECRET_KEY` and database passwords regularly.

## 6. Monitoring & Logs

-   **Logs**: Stored in `logs/` directory (configured in `src/core/logging_config.py`) and streamed to stdout for Docker logging drivers.
-   **Health Check**: Monitor `GET /api/v1/health` for uptime.
