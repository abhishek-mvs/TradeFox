import { Request, Response } from 'express';
import { userService } from '../../services/user_service.js';
import {
  CreateUserRequestSchema,
  UsersResponse,
} from '../../utils/serializers.js';

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await userService.getAllUsers();
    
    const response: UsersResponse = {
      users,
      total: users.length,
    };
    
    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch users',
    });
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = CreateUserRequestSchema.parse(req.body);
    const user = await userService.createUser(validatedData);
    
    res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    } else {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create user',
      });
    }
  }
};

