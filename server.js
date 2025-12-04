import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the Vite build output (dist)
app.use(express.static(path.join(__dirname, 'dist')));

// Health check endpoint for Azure App Service probing
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// SPA Catch-all: Send all non-static requests to index.html
// This allows React Router to handle the routing client-side
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});