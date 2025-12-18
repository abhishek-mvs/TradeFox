import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import app from "./app.js";
import { db } from "./pkg/db/db.js";

const PORT = process.env.PORT || 3000;

// Retry database connection with exponential backoff
const connectWithRetry = async (maxRetries = 5, delay = 2000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await db.connect();
      await db.query('SELECT NOW()');
      console.log('Database connection test successful');
      return;
    } catch (error) {
      if (i === maxRetries - 1) {
        console.error('Database connection test failed after retries:', error.message);
        console.error('Please check your database configuration in .env.local');
        throw error;
      }
      console.log(`Database connection attempt ${i + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
};

// Connect to database on startup
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check available at: http://localhost:${PORT}/health`);
  
  await connectWithRetry();
}); 