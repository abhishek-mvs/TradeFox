import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import routes from "./routes/index.js";

const app = express();

// Parse JSON request bodies
app.use(express.json());

// Serve static files from the public directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '../public')));

app.use(routes);

export default app;

