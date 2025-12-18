import { db } from '../pkg/db/db.js';
import { UserResponse, CreateUserRequest } from '../utils/serializers.js';

export class UserService {
  async getAllUsers(): Promise<UserResponse[]> {
    const result = await db.query(
      `SELECT 
        id,
        name,
        created_at,
        updated_at
       FROM users
       ORDER BY created_at DESC`
    );

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    }));
  }

  async createUser(request: CreateUserRequest): Promise<UserResponse> {
    const result = await db.query(
      `INSERT INTO users (name)
       VALUES ($1)
       RETURNING id, name, created_at, updated_at`,
      [request.name]
    );

    const user = result.rows[0];
    return {
      id: user.id,
      name: user.name,
      created_at: user.created_at.toISOString(),
      updated_at: user.updated_at.toISOString(),
    };
  }
}

export const userService = new UserService();

