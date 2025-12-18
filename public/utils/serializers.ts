import { z } from 'zod';

// Request serializers
export const CreateOrderRequestSchema = z.object({
  user_id: z.string().uuid('Invalid user ID format'),
  base_symbol: z.string().min(1, 'Base symbol is required'),
  quote_symbol: z.literal('USDC', {
    errorMap: () => ({ message: 'Quote symbol must be USDC' }),
  }),
  price: z.number().positive('Price must be positive'),
  base_quantity: z.number().positive('Base quantity must be positive'),
  side: z.enum(['buy', 'sell'], {
    errorMap: () => ({ message: 'Side must be either "buy" or "sell"' }),
  }),
});

export const GetOrdersRequestSchema = z.object({
  user_id: z.string().uuid('Invalid user ID format'),
});

export const GetPortfolioRequestSchema = z.object({
  user_id: z.string().uuid('Invalid user ID format'),
});

export const GetPnLRequestSchema = z.object({
  user_id: z.string().uuid('Invalid user ID format'),
});

export const UpdateUSDCBalanceRequestSchema = z.object({
  user_id: z.string().uuid('Invalid user ID format'),
  amount: z.number().positive('Amount must be positive'),
  action: z.enum(['add', 'withdraw'], {
    errorMap: () => ({ message: 'Action must be either "add" or "withdraw"' }),
  }),
});

export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;
export type GetOrdersRequest = z.infer<typeof GetOrdersRequestSchema>;
export type GetPortfolioRequest = z.infer<typeof GetPortfolioRequestSchema>;
export type GetPnLRequest = z.infer<typeof GetPnLRequestSchema>;
export type UpdateUSDCBalanceRequest = z.infer<typeof UpdateUSDCBalanceRequestSchema>;

// Response types
export interface TradeResponse {
  id: string;
  user_id: string;
  base_symbol: string;
  quote_symbol: string;
  price: number;
  base_quantity: number;
  quote_quantity: number;
  side: 'buy' | 'sell';
  status: 'EXECUTED' | 'CANCELLED';
  created_at: string;
}

export interface PortfolioItemResponse {
  asset_symbol: string;
  quantity: number;
  avg_buying_price: number;
  current_price: number;
  unrealized_pnl: number;
}

export interface PortfolioResponse {
  user_id: string;
  usdc_balance: number;
  holdings: PortfolioItemResponse[];
}

export interface UpdateUSDCBalanceResponse {
  user_id: string;
  usdc_balance: number;
  action: 'add' | 'withdraw';
  amount: number;
}

export interface PnLResponse {
  user_id: string;
  realized_pnl: number;
  unrealized_pnl: number;
  total_pnl: number;
}

export interface OrdersResponse {
  user_id: string;
  orders: TradeResponse[];
  total: number;
}

