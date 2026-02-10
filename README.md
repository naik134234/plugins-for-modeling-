# Enterprise Financial & Risk Modeling Platform

A production-ready financial risk modeling platform featuring advanced Value at Risk (VaR) engines, Monte Carlo simulations, and seamless integrations with Excel and Google Sheets.

## 🚀 Key Features

*   **Advanced Risk Engines**:
    *   **Value at Risk (VaR)**: Historical, Parametric (Variance-Covariance), and Monte Carlo methodologies.
    *   **Monte Carlo Simulations**: Generic simulation engine supporting custom distributions (Normal, Lognormal, Uniform, Triangular, PERT).
*   **API Endpoints**:
    ### Monte Carlo
    - `POST /api/v1/monte-carlo/simulate`: Run custom Monte Carlo simulations.

    ### Credit Risk
    - `POST /api/v1/credit-risk/merton`: Calculate probability of default using Merton Model.

    ### Sensitivity Analysis
    - `POST /api/v1/sensitivity/merton`: Run sensitivity analysis on credit risk parameters.

    ### Capital Budgeting
    - `POST /api/v1/capital-budgeting/calculate`: Calculate NPV, IRR, Payback Period, and PI.
*   **High-Performance Architecture**:
    *   **FastAPI Backend**: High-performance, async Python API.
    *   **Celery & Redis**: Asynchronous task queue for heavy computations.
    *   **PostgreSQL**: Robust relational database storage.
*   **Seamless Integrations**:
    *   **Excel Add-in**: Native taskpane integration using React & Office.js.
    *   **Google Sheets Add-on**: Sidebar integration using Google Apps Script.
*   **Security & Ops**:
    *   **JWT Authentication**: Secure stateless authentication.
    *   **Containerized**: Docker and Docker Compose support for easy deployment.
    *   **CI/CD**: GitHub Actions workflows for testing and linting.
*   **Educational**: Includes a [Theoretical Master Guide](THEORY.md) for finance concepts.

## 🏗️ Architecture Overview

The system is built on a modern micro-service architecture:

-   **API Service (`src/api`)**: Handles HTTP requests, authentication, and synchronous calculations.
-   **Worker Service (`src/workers`)**: Background worker for long-running Monte Carlo simulations.
-   **Database**: PostgreSQL for storing user data, risk models, and simulation results.
-   **Broker/Cache**: Redis for task queuing and caching frequent API responses.

## 🛠️ Getting Started

### Prerequisites

-   Docker & Docker Compose
-   Node.js 18+ (for Excel Add-in development)
-   Python 3.11+ (for local backend development)

### Quick Start (Docker)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-org/risk-modeling-platform.git
    cd risk-modeling-platform
    ```

2.  **Start the platform:**
    ```bash
    docker-compose up --build -d
    ```
    This starts the API, Worker, Database, and Redis.

3.  **Access the services:**
    -   **API Documentation**: [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)
    -   **Health Check**: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

4.  **Default Credentials**:
    -   An admin user is created on first login attempt if the database is empty.
    -   **Email**: `admin@example.com`
    -   **Password**: `admin123`

## 📊 Client Integrations

### Excel Add-in

Located in `excel-addin/`. Built with generic React + Vite + Office.js.

1.  Navigate to `excel-addin/`.
2.  Install dependencies: `npm install`.
3.  Start dev server: `npm run start`.
    -   This will launch Excel and sideload the add-in.
    -   The add-in connects to the backend API at `http://localhost:8000`.

### Google Sheets Add-on

Located in `google-sheets-addon/`. Built with Google Apps Script.

1.  Open a Google Sheet.
2.  Go to **Extensions > Apps Script**.
3.  Copy `Code.gs` and `Sidebar.html` contents into the script editor.
4.  **Important**: For local testing, tunnel your API using `ngrok http 8000` and update `API_BASE_URL` in `Code.gs`.
5.  Reload the sheet and use the **Risk Modeling** menu.

## 🧪 Testing

The project includes comprehensive test suites.

```bash
# Unit Tests
python -m pytest tests/unit

# Integration Tests
python -m pytest tests/integration
```

## 📦 Deployment

See `DEPLOY.md` for detailed production deployment instructions, including environment configuration, security hardening, and scaling strategies.

## 📝 License

Proprietary License.
