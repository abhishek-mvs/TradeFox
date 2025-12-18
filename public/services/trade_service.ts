import { db } from '../pkg/db/db.js';
import { v4 as uuidv4 } from 'uuid';
import { CreateOrderRequest, TradeResponse } from '../utils/serializers.js';
import { portfolioService } from './portfolio_service.js';

export class TradeService {
  async createOrder(request: CreateOrderRequest): Promise<TradeResponse> {
    // Get asset IDs
    const baseAsset = await db.query(
      'SELECT id FROM assets WHERE symbol = $1',
      [request.base_symbol]
    );
    const quoteAsset = await db.query(
      'SELECT id FROM assets WHERE symbol = $1',
      [request.quote_symbol]
    );

    if (baseAsset.rows.length === 0) {
      throw new Error(`Base asset ${request.base_symbol} not found`);
    }
    if (quoteAsset.rows.length === 0) {
      throw new Error(`Quote asset ${request.quote_symbol} not found`);
    }

    const baseAssetId = baseAsset.rows[0].id;
    const quoteAssetId = quoteAsset.rows[0].id;
    const quoteQuantity = request.price * request.base_quantity;

    // Create trade
    const tradeId = uuidv4();
    await db.query(
      `INSERT INTO trades (id, user_id, base_asset_id, quote_asset_id, price, base_quantity, quote_quantity, side, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'EXECUTED')`,
      [
        tradeId,
        request.user_id,
        baseAssetId,
        quoteAssetId,
        request.price,
        request.base_quantity,
        quoteQuantity,
        request.side,
      ]
    );

    // Update portfolio
    await portfolioService.updatePortfolio(
      request.user_id,
      baseAssetId,
      request.base_quantity,
      request.price,
      request.side
    );

    // Fetch and return the created trade
    const trade = await this.getTradeById(tradeId);
    return trade;
  }

  async getOrdersByUserId(userId: string): Promise<TradeResponse[]> {
    const trades = await db.query(
      `SELECT 
        t.id,
        t.user_id,
        ba.symbol as base_symbol,
        qa.symbol as quote_symbol,
        t.price,
        t.base_quantity,
        t.quote_quantity,
        t.side,
        t.status,
        t.created_at
       FROM trades t
       JOIN assets ba ON t.base_asset_id = ba.id
       JOIN assets qa ON t.quote_asset_id = qa.id
       WHERE t.user_id = $1
       ORDER BY t.created_at DESC`,
      [userId]
    );

    return trades.rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      base_symbol: row.base_symbol,
      quote_symbol: row.quote_symbol,
      price: parseFloat(row.price),
      base_quantity: parseFloat(row.base_quantity),
      quote_quantity: parseFloat(row.quote_quantity),
      side: row.side,
      status: row.status,
      created_at: row.created_at.toISOString(),
    }));
  }

  async getTradeById(tradeId: string): Promise<TradeResponse> {
    const trade = await db.query(
      `SELECT 
        t.id,
        t.user_id,
        ba.symbol as base_symbol,
        qa.symbol as quote_symbol,
        t.price,
        t.base_quantity,
        t.quote_quantity,
        t.side,
        t.status,
        t.created_at
       FROM trades t
       JOIN assets ba ON t.base_asset_id = ba.id
       JOIN assets qa ON t.quote_asset_id = qa.id
       WHERE t.id = $1`,
      [tradeId]
    );

    if (trade.rows.length === 0) {
      throw new Error(`Trade with id ${tradeId} not found`);
    }

    const row = trade.rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      base_symbol: row.base_symbol,
      quote_symbol: row.quote_symbol,
      price: parseFloat(row.price),
      base_quantity: parseFloat(row.base_quantity),
      quote_quantity: parseFloat(row.quote_quantity),
      side: row.side,
      status: row.status,
      created_at: row.created_at.toISOString(),
    };
  }
}

export const tradeService = new TradeService();

