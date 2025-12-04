# Integration & Developer Guide

This document outlines the architecture, configuration, and deployment steps for the IntakeAI application. The app supports a dual-provider architecture (Google Gemini & Azure OpenAI) and is designed for deployment on Azure.

---

## 1. Environment Configuration

 The application relies on `config.ts` to manage settings. While some defaults are hardcoded for development, sensitive keys should be passed via Environment Variables during build/deployment.

### Required Variables

Create a `.env` file for local development or set these in your Azure App Service configuration.

**For Azure OpenAI (Default):**
```bash
# Your Azure OpenAI Resource Endpoint (e.g., https://my-resource.openai.azure.com/)
AZURE_OPENAI_ENDPOINT=https://<resource-name>.openai.azure.com/

# Your Azure OpenAI API Key
AZURE_OPENAI_API_KEY=<your-key>

# The Deployment Name in Azure AI Studio
# NOTE: This deployment must support the Realtime API (e.g., gpt-4o-realtime-preview)
AZURE_OPENAI_DEPLOYMENT=gpt-4o-realtime-preview

# (Optional) Azure Function URL for "Push to Cloud" feature
REACT_APP_STORAGE_ENDPOINT=https://<your-func-app>.azurewebsites.net/api/uploadSession
```

**For Google Gemini (Optional fallback):**
```bash
API_KEY=<your-gemini-api-key>
```

**For Entra ID (SSO):**
```bash
AZURE_CLIENT_ID=<client-id-from-app-registration>
AZURE_TENANT_ID=<your-tenant-id>
```

---

## 2. Architecture Overview

### Realtime Voice (Conversational Agent)
*   **Provider**: Azure OpenAI Realtime API (`/openai/realtime`).
*   **Protocol**: WebSockets (`wss://`).
*   **Behavior**: Streams raw PCM16 audio (24kHz) to the model. The model handles Voice Activity Detection (VAD) and streams back audio deltas.
*   **File**: `App.tsx` handles the WebSocket connection and audio buffer management.

### Analyst Agent (Data Processor)
*   **Provider**: Azure OpenAI Chat Completions (`/chat/completions`).
*   **Protocol**: REST (HTTPS).
*   **Behavior**: Takes the conversation transcript and current JSON state, then uses `response_format: { type: "json_object" }` to strictly enforce the output schema defined in `services/analysisService.ts`.

---

## 3. Storage Integration ("Push to Cloud")

The application includes a "Push to Cloud" button in the Artifact Viewer. This sends a POST request to the configured `storageEndpoint`.

### Expected Backend Implementation
You need to deploy an Azure Function (Python/Node/C#) to receive this data.

**Request Payload Schema:**
The app sends the following JSON body:
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

## 4. Authentication (Entra ID / Azure AD)

The application includes a pre-built Login Screen and Auth Service compatible with MSAL (Microsoft Authentication Library).

### How to Enable SSO

1.  **Register an App in Azure Entra ID:**
    *   Go to Azure Portal > Entra ID > App Registrations > New Registration.
    *   **Name**: IntakeAI.
    *   **Supported Account Types**: Single Tenant (Corporate) or Multitenant.
    *   **Redirect URI (SPA)**: `https://<your-static-web-app-url>` (and `http://localhost:3000` for dev).

2.  **Update Configuration:**
    *   Open `config.ts`.
    *   Set `auth.enabled` to `true`.
    *   Update `clientId` and `authority` (Tenant ID).

---

## 5. Deployment Guide

The application uses **Vite for building** the static assets and **Express.js for serving** them in production. This ensures compatibility with Azure App Service routing and provides headers for security and performance.

### Option 1: Azure Static Web Apps (Recommended)

1.  **Push Code**: Commit your changes to GitHub/Azure DevOps.
2.  **Create Resource**:
    *   Azure Portal > Create "Static Web App".
    *   Link your repository.
    *   **Build Preset**: React.
    *   **App Location**: `/`.
    *   **Output Location**: `dist`.
3.  **Environment Variables**:
    *   In the Azure Portal resource, go to **Settings > Environment variables**.
    *   Add the variables listed in Section 1.

### Option 2: Azure Web App (App Service) - Node.js

This method uses the included `server.js` (Express) script to serve the application. This is ideal for scenarios where you need custom server-side logic or specific compliance headers.

1.  **Build**:
    Run `npm install` followed by `npm run build`. This creates a `dist` folder with the compiled assets.

2.  **Prepare Artifact**:
    Ensure `server.js`, `package.json`, `node_modules`, and the `dist` folder are included in your deployment artifact.
    *   *Note: If using Azure DevOps/GitHub Actions, `npm install --production` can be run to exclude devDependencies, but ensure `compression` and `express` are in regular `dependencies`.*

3.  **Deployment**:
    Deploy to an Azure Web App configured with a **Node.js runtime** (e.g., Node 20 LTS).

4.  **Startup Command**:
    Azure usually detects `npm start` automatically from `package.json`.
    If not, set the startup command to: `node server.js`

5.  **Environment Variables**:
    Add the variables in **Settings > Configuration** in the Azure Portal.
    *   `PORT` is automatically injected by Azure; `server.js` listens on it.
    *   Add your `AZURE_OPENAI_API_KEY` etc. **Note:** Since Vite builds the app, environment variables used in `config.ts` (via `process.env`) must be present at **build time** (in your CI/CD pipeline) to be baked into the JS bundles, OR you must implement a runtime injection strategy if you want to change keys without rebuilding.
