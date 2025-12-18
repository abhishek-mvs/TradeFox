import { db } from '../pkg/db/db.js';
import { PnLResponse } from '../utils/serializers.js';
import { portfolioService } from './portfolio_service.js';

export class PnLService {
  // Calculate realized PnL using FIFO method
  async calculateRealizedPnL(userId: string): Promise<number> {
    // Get all executed trades for the user, ordered by time
    const trades = await db.query(
      `SELECT 
        t.id,
        ba.symbol as base_symbol,
        t.price,
        t.base_quantity,
        t.side,
        t.created_at
       FROM trades t
       JOIN assets ba ON t.base_asset_id = ba.id
       WHERE t.user_id = $1 AND t.status = 'EXECUTED'
       ORDER BY t.created_at ASC`,
      [userId]
    );

    let realizedPnL = 0;
    // Maintain separate position queues for each asset symbol
    const positionQueues: Map<string, Array<{ quantity: number; price: number }>> = new Map();

    for (const trade of trades.rows) {
      const symbol = trade.base_symbol;
      const quantity = parseFloat(trade.base_quantity);
      const price = parseFloat(trade.price);

      // Get or create position queue for this asset
      if (!positionQueues.has(symbol)) {
        positionQueues.set(symbol, []);
      }
      const positionQueue = positionQueues.get(symbol)!;

      if (trade.side === 'buy') {
        // Add to position queue (FIFO) for this specific asset
        positionQueue.push({ quantity, price });
      } else {
        // Sell - match against FIFO queue for this specific asset
        let remainingSellQuantity = quantity;

        while (remainingSellQuantity > 0 && positionQueue.length > 0) {
          const position = positionQueue[0];

          if (position.quantity <= remainingSellQuantity) {
            // Fully consume this position
            const pnl = (price - position.price) * position.quantity;
            realizedPnL += pnl;
            remainingSellQuantity -= position.quantity;
            positionQueue.shift();
          } else {
            // Partially consume this position
            const pnl = (price - position.price) * remainingSellQuantity;
            realizedPnL += pnl;
            position.quantity -= remainingSellQuantity;
            remainingSellQuantity = 0;
          }
        }

        if (remainingSellQuantity > 0) {
          // This shouldn't happen if portfolio is managed correctly
          console.warn(`Unmatched sell quantity for ${symbol}: ${remainingSellQuantity}`);
        }
      }
    }

    return realizedPnL;
  }

  async calculateUnrealizedPnL(userId: string): Promise<number> {
    const { holdings } = await portfolioService.getPortfolio(userId);
    
    return holdings.reduce((total: number, holding) => {
      return total + holding.unrealized_pnl;
    }, 0);
  }

  async getPnL(userId: string): Promise<PnLResponse> {
    const realizedPnL = await this.calculateRealizedPnL(userId);
    const unrealizedPnL = await this.calculateUnrealizedPnL(userId);
    const totalPnL = realizedPnL + unrealizedPnL;

    return {
      user_id: userId,
      realized_pnl: realizedPnL,
      unrealized_pnl: unrealizedPnL,
      total_pnl: totalPnL,
    };
  }
}

export const pnlService = new PnLService();

