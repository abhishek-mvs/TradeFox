import { Request, Response } from 'express';
import { tradeService } from '../../services/trade_service.js';
import {
  CreateOrderRequestSchema,
  GetOrdersRequestSchema,
  OrdersResponse,
} from '../../utils/serializers.js';

export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = CreateOrderRequestSchema.parse(req.body);
    const trade = await tradeService.createOrder(validatedData);
    res.status(201).json({
      success: true,
      data: trade,
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
        error: error.message || 'Failed to create order',
      });
    }
  }
};

export const getOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = GetOrdersRequestSchema.parse(req.body);
    const orders = await tradeService.getOrdersByUserId(validatedData.user_id);
    
    const response: OrdersResponse = {
      user_id: validatedData.user_id,
      orders,
      total: orders.length,
    };
    
    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch orders',
      });
    }
  }
};

