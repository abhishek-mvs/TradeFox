import { db } from '../pkg/db/db.js';
import { PortfolioItemResponse } from '../utils/serializers.js';
import { pythClient } from '../clients/pyth.js';

export class PortfolioService {
  // Update portfolio using FIFO method for average cost calculation
  async updatePortfolio(
    userId: string,
    assetId: string,
    quantity: number,
    price: number,
    side: 'buy' | 'sell'
  ): Promise<void> {
    // Get current portfolio position
    const currentPosition = await db.query(
      'SELECT * FROM portfolio WHERE user_id = $1 AND asset_id = $2',
      [userId, assetId]
    );

    if (currentPosition.rows.length === 0) {
      // No existing position
      if (side === 'buy') {
        // Create new position
        await db.query(
          `INSERT INTO portfolio (user_id, asset_id, quantity, avg_buying_price)
           VALUES ($1, $2, $3, $4)`,
          [userId, assetId, quantity, price]
        );
      } else {
        // Can't sell what you don't have
        throw new Error('Insufficient balance for sell order');
      }
    } else {
      const current = currentPosition.rows[0];
      const currentQuantity = parseFloat(current.quantity);
      const currentAvgPrice = parseFloat(current.avg_buying_price);

      if (side === 'buy') {
        // Calculate new average price using weighted average
        const totalCost = currentQuantity * currentAvgPrice + quantity * price;
        const newQuantity = currentQuantity + quantity;
        const newAvgPrice = totalCost / newQuantity;

        await db.query(
          `UPDATE portfolio 
           SET quantity = $1, avg_buying_price = $2, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $3 AND asset_id = $4`,
          [newQuantity, newAvgPrice, userId, assetId]
        );
      } else {
        // Sell side - using FIFO, we just reduce quantity
        // Average price stays the same for remaining quantity
        if (currentQuantity < quantity) {
          throw new Error('Insufficient balance for sell order');
        }

        const newQuantity = currentQuantity - quantity;
        if (newQuantity === 0) {
          // Remove position if quantity becomes zero
          await db.query(
            'DELETE FROM portfolio WHERE user_id = $1 AND asset_id = $2',
            [userId, assetId]
          );
        } else {
          await db.query(
            `UPDATE portfolio 
             SET quantity = $1, updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $2 AND asset_id = $3`,
            [newQuantity, userId, assetId]
          );
        }
      }
    }
  }

  async getPortfolio(userId: string): Promise<PortfolioItemResponse[]> {
    const portfolio = await db.query(
      `SELECT 
        p.asset_id,
        a.symbol as asset_symbol,
        p.quantity,
        p.avg_buying_price
       FROM portfolio p
       JOIN assets a ON p.asset_id = a.id
       WHERE p.user_id = $1 AND p.quantity > 0
       ORDER BY a.symbol`,
      [userId]
    );

    const holdings: PortfolioItemResponse[] = [];

    for (const row of portfolio.rows) {
      const symbol = row.asset_symbol;
      const quantity = parseFloat(row.quantity);
      const avgBuyingPrice = parseFloat(row.avg_buying_price);

      // Get current price from Pyth
      const currentPrice = await pythClient.getPrice(symbol);

      // Calculate unrealized PnL
      const unrealizedPnl = (currentPrice - avgBuyingPrice) * quantity;

      holdings.push({
        asset_symbol: symbol,
        quantity,
        avg_buying_price: avgBuyingPrice,
        current_price: currentPrice,
        unrealized_pnl: unrealizedPnl,
      });
    }

    return holdings;
  }
}

export const portfolioService = new PortfolioService();

