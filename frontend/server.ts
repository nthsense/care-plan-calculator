import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createProxyMiddleware } from "http-proxy-middleware";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Proxy /api requests to the backend service
app.use(
  "/api",
  createProxyMiddleware({
    target: "http://backend:3001/api", // Your backend API server
    changeOrigin: true,
  }),
);

// The React app's static files are in 'dist', one level up from this script's location in 'dist-server'
const staticFilesPath = path.join(__dirname, "..", "dist");

// Serve static files from the React app
app.use(express.static(staticFilesPath));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get("/", (_req, res) => {
  res.sendFile(path.join(staticFilesPath, "index.html"));
});

app.listen(port, () => {
  console.log(`Frontend server listening at http://localhost:${port}`);
});
