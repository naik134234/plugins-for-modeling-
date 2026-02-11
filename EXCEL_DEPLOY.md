# Excel Add-in Deployment Guide

This guide explains how to deploy the Risk Modeling Platform's Excel Add-in to users.

## 📋 Prerequisites

1.  **Backend API**: The backend API must be deployed and accessible via HTTPS (e.g., `https://api.your-company.com`).
2.  **Web Server**: You need a place to host the static frontend files (HTML, JS, CSS) of the add-in (e.g., Azure Static Web Apps, AWS S3, or Nginx).

---

## 🚀 Step 1: Prepare for Production

Before deploying, you must configure the add-in to point to your production API.

1.  **Build the Project**:
    Navigate to the `excel-addin` folder and build the assets.
    ```bash
    cd excel-addin
    npm install
    npm run build
    ```
    This creates a `dist/` folder containing your static website.

2.  **Update Manifest URLs**:
    Open `excel-addin/manifest.xml`. You need to replace the local development URLs with your production URLs.
    
    *   **SourceLocation**: Replace `https://localhost:3000/taskpane.html` with your hosted URL (e.g., `https://addin.your-company.com/taskpane.html`).
    *   **AppDomains**: Add your API domain (e.g., `https://api.your-company.com`) to avoid CORS/security issues.

---

## ☁️ Step 2: Host the Static Files

Upload the contents of the `dist/` folder to your web host.

*   **Azure**: Use Azure Static Web Apps.
*   **AWS**: Upload to an S3 bucket and enable static website hosting (ensure HTTPS via CloudFront).
*   **Netlify/Vercel**: Connect your repo and deploy the `excel-addin` folder.

**Verification**: Visit `https://addin.your-company.com/taskpane.html` in your browser. You should see the add-in UI (it might look empty without Excel context, but it should load).

---

## 📥 Step 3: Install in Excel (3 Methods)

There are three ways to get the add-in into Excel.

### Method A: Network Shared Folder (Best for Internal Teams)

1.  Create a folder on a network drive accessible to your users (e.g., `\\NetworkShare\OfficeAddins`).
2.  Copy your **updated** `manifest.xml` file to this folder.
3.  In Excel (Desktop):
    *   Go to **File > Options > Trust Center > Trust Center Settings > Trusted Add-in Catalogs**.
    *   Add your network path (`\\NetworkShare\OfficeAddins`).
    *   Check **"Show in Menu"** and click OK.
    *   Restart Excel.
4.  To use: Go to **Insert > My Add-ins > Shared Folder** and select your add-in.

### Method B: Microsoft 365 Admin Center (Best for Organization-wide)

1.  Go to the [Microsoft 365 Admin Center](https://admin.microsoft.com).
2.  Navigate to **Settings > Integrated apps**.
3.  Click **Upload custom apps**.
4.  Select **"Upload manifest file (.xml) from device"** and upload your production `manifest.xml`.
5.  Assign users (e.g., "Entire Organization" or specific groups).
6.  The add-in will automatically appear in the **Admin Managed** tab of Excel for your users within 24 hours.

### Method C: Sideloading (Best for Development/Testing)

1.  **Web Excel**:
    *   Go to Excel on the Web.
    *   **Insert > Add-ins > Manage My Add-ins > Upload My Add-in**.
    *   Upload `manifest.xml`.
2.  **Desktop (Windows)**:
    *   Run `npm run start` in the `excel-addin` directory (requires Node.js installed locally).

---

## 🔧 Troubleshooting

*   **"Add-in Error"**: Ensure your `manifest.xml` URLs are essentially correct and use **HTTPS**. Excel blocks HTTP content.
*   **Backend Connection Fail**: Check the browser console (Right-click in taskpane > Inspect). Ensure your API supports CORS for your add-in domain.
*   **White Screen**: Ensure all files in `dist/` were uploaded and paths in `index.html` are relative or correct.
