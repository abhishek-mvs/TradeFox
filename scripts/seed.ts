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

const seedDatabase = async () => {
  try {
    await db.connect();

    // Check if data already exists
    const existingUsers = await db.query("SELECT COUNT(*) as count FROM users");
    const existingAssets = await db.query("SELECT COUNT(*) as count FROM assets");
    
    if (parseInt(existingUsers.rows[0].count) > 0 && parseInt(existingAssets.rows[0].count) > 0) {
      console.log("✅ Database already seeded, skipping...");
      return;
    }

    // Insert USDC asset (quote asset)
    const usdcResult = await db.query(`
      INSERT INTO assets (name, symbol) 
      VALUES ('USD Coin', 'USDC') 
      ON CONFLICT (symbol) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `);
    const usdcId = usdcResult.rows[0].id;

    // Insert base assets
    const assets = [
      { name: 'Bitcoin', symbol: 'BTC' },
      { name: 'Ethereum', symbol: 'ETH' },
      { name: 'Solana', symbol: 'SOL' }
    ];

    const assetIds: { [key: string]: string } = { USDC: usdcId };

    for (const asset of assets) {
      const result = await db.query(`
        INSERT INTO assets (name, symbol) 
        VALUES ($1, $2) 
        ON CONFLICT (symbol) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `, [asset.name, asset.symbol]);
      assetIds[asset.symbol] = result.rows[0].id;
    }

    // Insert test users
    const users = [
      { name: 'Test User 1' },
      { name: 'Test User 2' },
      { name: 'Test User 3' }
    ];

    const userIds: string[] = [];
    for (const user of users) {
      // Check if user already exists
      const existingUser = await db.query(`
        SELECT id FROM users WHERE name = $1
      `, [user.name]);
      
      if (existingUser.rows.length > 0) {
        userIds.push(existingUser.rows[0].id);
      } else {
        // Insert new user
        const result = await db.query(`
          INSERT INTO users (name) 
          VALUES ($1) 
          RETURNING id
        `, [user.name]);
        userIds.push(result.rows[0].id);
      }
    }

    console.log("✅ Database seeded successfully");
    console.log("📊 Assets:", Object.keys(assetIds).join(", "));
    console.log("👥 Users:", userIds.length);
    console.log("\nAsset IDs:", assetIds);
    console.log("User IDs:", userIds);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  } finally {
    await db.disconnect();
  }
};

seedDatabase();

