# Integration & Developer Guide

This document outlines the architecture, configuration, and deployment steps for the IntakeAI application. The app is designed for deployment on **Azure Web App Service** (Node.js or Container) and supports runtime configuration injection.

---

## 1. Environment Configuration

The application uses a **Runtime Injection** strategy (`/env-config.js`). This allows you to manage settings via Azure App Service "Environment Variables" without rebuilding the React application.

### Local Development
Create a `.env` file in the root directory using the provided example.
```bash
cp .env.example .env
```
Fill in your keys in `.env`. This file is git-ignored to protect your secrets.

### Required Variables
Set these in your **Azure Portal > App Service > Settings > Environment variables**.

**Azure OpenAI Resources:**
```bash
# Your Azure OpenAI Resource Endpoint
AZURE_OPENAI_ENDPOINT=https://<resource-name>.openai.azure.com/

# Your Azure OpenAI API Key
AZURE_OPENAI_API_KEY=<your-key>

# 1. Realtime Voice Model (Voice Agent)
# Must be a "gpt-4o-realtime-preview" deployment
AZURE_OPENAI_DEPLOYMENT=gpt-4o-realtime-preview

# 2. Analysis/Chat Model (Data Extraction Agent)
# Should be a standard chat model like "gpt-4o" or "gpt-35-turbo"
# This model is used to analyze the transcript and convert it to JSON.
# If omitted, the app will try to use the Realtime deployment for analysis (which may work but is less efficient).
AZURE_OPENAI_ANALYSIS_DEPLOYMENT=gpt-4o
```

**Authentication (Entra ID / Azure AD):**
*Setting `AZURE_CLIENT_ID` automatically enables SSO enforcement.*
```bash
# Application (client) ID from App Registration
AZURE_CLIENT_ID=<client-id-guid>

# Directory (tenant) ID
AZURE_TENANT_ID=<tenant-id-guid>
```

**Repository Storage (Auto-Save):**
```bash
# URL to your Azure Function or Backend that accepts the JSON save file
REACT_APP_STORAGE_ENDPOINT=https://<your-func-app>.azurewebsites.net/api/uploadSession
```

---

## 2. Architecture Overview

### Runtime Configuration
*   **Mechanism**: The `server.js` (Express) server reads `process.env` from the Azure container environment.
*   **Injection**: It serves a dynamic file at `/env-config.js` which attaches these values to `window.env` in the browser.
*   **Benefit**: You can rotate keys or change endpoints in the Azure Portal and simply restart the app; no code rebuild is required.

### Agents
1.  **Realtime Agent (Voice)**: Connects via WebSocket (`wss://`) to Azure OpenAI Realtime API. Handles VAD and audio streaming.
    *   Configured via `AZURE_OPENAI_DEPLOYMENT`.
2.  **Analyst Agent (Logic)**: Connects via REST (`https://`) to Azure OpenAI Chat Completions. Uses JSON Mode to structure requirements.
    *   Configured via `AZURE_OPENAI_ANALYSIS_DEPLOYMENT`.

---

## 3. Storage Integration (Auto-Save)

The application generates a "Save File" containing the structured JSON session data and a Markdown report.

**Triggers:**
1.  **Manual**: User clicks "Push to Cloud" in the Artifact Viewer.
2.  **Automatic**: Triggered when the user clicks "Exit" or "Sign Out".

**Payload Schema:**
The application sends a `POST` request to `REACT_APP_STORAGE_ENDPOINT` with the following body:
```json
{
  "export_id": "guid-uuid-v4",
  "session_id": "session_xyz",
  "timestamp": "ISO-8601-Date",
  "project_name": "Project Title",
  "json_data": { ...full session export object... },
  "document_content": "# Markdown Report Content...",
  "document_format": "markdown"
}
```

---

## 4. Authentication (Entra ID)

The app uses MSAL (Microsoft Authentication Library) for Single Sign-On.

**Behavior:**
*   If `AZURE_CLIENT_ID` is present in the environment variables, the app will strictly require login before accessing the workspace.
*   If `AZURE_CLIENT_ID` is missing or set to the default zero-GUID, the app enters **Development Mode** (Auth Bypassed).

**Azure Setup:**
1.  Register an App in Entra ID.
2.  Add `Single-page application` platform.
3.  Add Redirect URI: `https://<your-app-name>.azurewebsites.net` (and `http://localhost:3000` for local dev).
4.  Grant `User.Read` permission.

---

## 5. Deployment Guide (Azure Web App)

This is the recommended deployment method as it supports the `server.js` runtime configuration.

### Steps

1.  **Build the Project:**
    ```bash
    npm install
    npm run build
    ```
    This creates a `dist/` directory with the React assets.

2.  **Prepare Artifact:**
    Ensure your deployment artifact (zip or container) includes:
    *   `dist/` (folder)
    *   `node_modules/` (production dependencies)
    *   `server.js`
    *   `package.json`

3.  **Deploy to Azure Web App:**
    *   Create a **Web App** resource (Runtime: Node 20 LTS).
    *   Deploy your artifact via Azure CLI, VS Code, or GitHub Actions.

4.  **Startup Command:**
    Azure should detect `package.json`, but if needed, set the Startup Command in **Configuration > General Settings**:
    ```bash
    node server.js
    ```

5.  **Configure Environment:**
    Go to **Configuration > Environment variables** and add the keys listed in Section 1.

6.  **Verify:**
    Load the site. Open DevTools > Console and type `window.env`. You should see your Azure settings populated.
