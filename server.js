import express from 'express';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Enable gzip/brotli compression for performance
app.use(compression());

// Health check endpoint for Azure App Service probing
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Runtime Configuration Endpoint
// This allows Azure App Settings to be injected into the client-side application at runtime
// avoiding the need to rebuild the app when keys or endpoints change.
app.get('/env-config.js', (req, res) => {
  const envVariables = {
    API_KEY: process.env.API_KEY,
    AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT,
    AZURE_CLIENT_ID: process.env.AZURE_CLIENT_ID,
    AZURE_TENANT_ID: process.env.AZURE_TENANT_ID,
    REACT_APP_STORAGE_ENDPOINT: process.env.REACT_APP_STORAGE_ENDPOINT,
    AZURE_OPENAI_DEPLOYMENT: process.env.AZURE_OPENAI_DEPLOYMENT
  };

  res.setHeader('Content-Type', 'application/javascript');
  res.send(`window.env = ${JSON.stringify(envVariables)};`);
});

// Serve static files from the Vite build output (dist)
// Set long cache for hashed assets, but no-cache for index.html
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: '1y',
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'public, max-age=0');
    }
  }
}));

// SPA Catch-all: Send all non-static requests to index.html
// This allows React Router to handle the routing client-side
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});