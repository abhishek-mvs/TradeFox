import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "../public/pkg/db/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local if it exists (for local development)
// In Docker, environment variables are already set
try {
  dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
} catch (error) {
  // .env.local might not exist in Docker, that's okay
}

const createTables = async () => {
  try {
    await db.connect();

    // Create Users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create Assets table
    await db.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        symbol VARCHAR(50) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create Trades table
    await db.query(`
      CREATE TABLE IF NOT EXISTS trades (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        base_asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        quote_asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        price DECIMAL(20, 8) NOT NULL,
        base_quantity DECIMAL(20, 8) NOT NULL,
        quote_quantity DECIMAL(20, 8) NOT NULL,
        side VARCHAR(10) NOT NULL CHECK (side IN ('buy', 'sell')),
        status VARCHAR(20) NOT NULL DEFAULT 'EXECUTED' CHECK (status IN ('EXECUTED', 'CANCELLED')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create Portfolio table
    await db.query(`
      CREATE TABLE IF NOT EXISTS portfolio (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        quantity DECIMAL(20, 8) NOT NULL DEFAULT 0,
        avg_buying_price DECIMAL(20, 8) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, asset_id)
      )
    `);

    // Create indexes for better performance
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
      CREATE INDEX IF NOT EXISTS idx_trades_created_at ON trades(created_at);
      CREATE INDEX IF NOT EXISTS idx_portfolio_user_id ON portfolio(user_id);
      CREATE INDEX IF NOT EXISTS idx_portfolio_asset_id ON portfolio(asset_id);
    `);

    console.log("✅ Database tables created successfully");
  } catch (error) {
    console.error("❌ Error creating tables:", error);
    throw error;
  } finally {
    await db.disconnect();
  }
};

createTables();

