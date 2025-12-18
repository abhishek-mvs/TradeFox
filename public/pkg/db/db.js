import { Client } from 'pg';

class Database {
  constructor() {
    this.client = new Client({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'tradefox',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 5432,
    });
  }

  async connect() {
    try {
      await this.client.connect();
    } catch (error) {
      throw error;
    }
  }

  async disconnect() {
    try {
      await this.client.end();
    } catch (error) {
      throw error;
    }
  }

  async fetchDataFromDb(query, params = []) {
    try {
      const result = await this.client.query(query, params);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async updateDataInDb(query, params = []) {
    try {
      await this.client.query(query, params);
    } catch (error) {
      throw error;
    }
  }

  async query(queryText, params = []) {
    try {
      const result = await this.client.query(queryText, params);
      return result;
    } catch (error) {
      throw error;
    }
  }
}

const db = new Database();
export { db };
export default db;
