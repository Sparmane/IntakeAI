# Integration & Developer Guide

This document outlines the architecture, configuration, and deployment steps for the IntakeAI application. The app supports a dual-provider architecture (Google Gemini & Azure OpenAI) and is designed for deployment on Azure Static Web Apps.

---

## 1. Environment Configuration

 The application relies on `config.ts` to manage settings. While some defaults are hardcoded for development, sensitive keys should be passed via Environment Variables during build/deployment.

### Required Variables

Create a `.env` file for local development or set these in your Azure Static Web App configuration.

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

**Example Azure Function (Python v2):**

```python
import azure.functions as func
import json
import logging

def main(req: func.HttpRequest, outputBlob: func.Out[func.InputStream]) -> func.HttpResponse:
    try:
        req_body = req.get_json()
        export_id = req_body.get('export_id')
        
        # 1. Save JSON Data to Blob Storage
        # You would typically use the outputBlob binding here or the SDK
        
        # 2. Save Markdown Doc to Blob Storage
        doc_content = req_body.get('document_content')
        
        return func.HttpResponse(
            json.dumps({"success": true, "guid": export_id}),
            mimetype="application/json"
        )
    except ValueError:
        return func.HttpResponse("Invalid JSON", status_code=400)
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

3.  **Deploy:**
    *   Once enabled, the `App.tsx` will check `authService.checkAuth()`. If not authenticated, it renders `<LoginScreen />` instead of the main app.

---

## 5. Deployment Guide

### Azure Static Web Apps (Recommended)

1.  **Push Code**: Commit your changes to GitHub.
2.  **Create Resource**:
    *   Azure Portal > Create "Static Web App".
    *   Link your GitHub repository.
    *   **Build Preset**: React.
    *   **App Location**: `/`.
    *   **Output Location**: `dist` (or `build` depending on bundler).
3.  **Environment Variables**:
    *   In the Azure Portal resource, go to **Settings > Environment variables**.
    *   Add the variables listed in Section 1.

### Troubleshooting Azure Realtime API

*   **401 Unauthorized**: Check your `AZURE_OPENAI_API_KEY`.
*   **404 Not Found**: Verify your `AZURE_OPENAI_ENDPOINT` and `AZURE_OPENAI_DEPLOYMENT`. The model **must** be a "Realtime" capable model (e.g., `gpt-4o-realtime-preview`) deployed in a supported region (e.g., East US 2, Sweden Central). Standard GPT-4o deployments do not support the `/realtime` WebSocket endpoint.
*   **WebSocket Error**: Ensure your corporate firewall allows `wss://` connections to `*.openai.azure.com`.
