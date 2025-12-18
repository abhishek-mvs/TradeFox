import { Client, QueryResult, QueryResultRow } from 'pg';

class Database {
  private client: Client;

  constructor() {
    this.client = new Client({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'tradefox',
      password: process.env.DB_PASSWORD || '',
      port: parseInt(process.env.DB_PORT || '5432', 10),
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.end();
    } catch (error) {
      throw error;
    }
  }

  async fetchDataFromDb<T = any>(query: string, params: any[] = []): Promise<T[]> {
    try {
      const result = await this.client.query(query, params);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async updateDataInDb(query: string, params: any[] = []): Promise<void> {
    try {
      await this.client.query(query, params);
    } catch (error) {
      throw error;
    }
  }

  async query<T extends QueryResultRow = any>(queryText: string, params: any[] = []): Promise<QueryResult<T>> {
    try {
      const result = await this.client.query<T>(queryText, params);
      return result;
    } catch (error) {
      throw error;
    }
  }
}

const db = new Database();
export { db };
export default db;

