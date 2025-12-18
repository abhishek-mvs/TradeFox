import { db } from '../pkg/db/db.js';
import { PortfolioItemResponse } from '../utils/serializers.js';
import { pythClient } from '../clients/pyth.js';

export class PortfolioService {
  /**
   * Recalculate average cost using FIFO method by simulating all trades
   * This ensures consistency with PnL calculation
   */
  private async recalculateAverageCostFIFO(
    userId: string,
    assetId: string,
    expectedRemainingQuantity: number
  ): Promise<number> {
    // Get all executed trades for this asset, ordered by time
    const trades = await db.query(
      `SELECT 
        t.price,
        t.base_quantity,
        t.side,
        t.created_at
       FROM trades t
       WHERE t.user_id = $1 
         AND t.base_asset_id = $2 
         AND t.status = 'EXECUTED'
       ORDER BY t.created_at ASC`,
      [userId, assetId]
    );

    // Maintain FIFO queue of positions
    const positionQueue: Array<{ quantity: number; price: number }> = [];

    for (const trade of trades.rows) {
      const quantity = parseFloat(trade.base_quantity);
      const price = parseFloat(trade.price);

      if (trade.side === 'buy') {
        // Add to position queue (FIFO)
        positionQueue.push({ quantity, price });
      } else {
        // Sell - match against FIFO queue
        let remainingSellQuantity = quantity;

        while (remainingSellQuantity > 0 && positionQueue.length > 0) {
          const position = positionQueue[0];

          if (position.quantity <= remainingSellQuantity) {
            // Fully consume this position
            remainingSellQuantity -= position.quantity;
            positionQueue.shift();
          } else {
            // Partially consume this position
            position.quantity -= remainingSellQuantity;
            remainingSellQuantity = 0;
          }
        }
      }
    }

    // Calculate average cost from remaining positions
    let totalCost = 0;
    let totalQuantity = 0;

    for (const position of positionQueue) {
      totalCost += position.quantity * position.price;
      totalQuantity += position.quantity;
    }

    // Verify we have the expected remaining quantity
    if (Math.abs(totalQuantity - expectedRemainingQuantity) > 0.0001) {
      console.warn(
        `Quantity mismatch: expected ${expectedRemainingQuantity}, calculated ${totalQuantity}`
      );
    }

    return totalQuantity > 0 ? totalCost / totalQuantity : 0;
  }

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
        // Sell side - using FIFO, recalculate average cost of remaining positions
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
          // Recalculate average cost using FIFO logic
          // This ensures consistency with PnL calculation
          const newAvgPrice = await this.recalculateAverageCostFIFO(
            userId,
            assetId,
            newQuantity
          );
          
          await db.query(
            `UPDATE portfolio 
             SET quantity = $1, avg_buying_price = $2, updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $3 AND asset_id = $4`,
            [newQuantity, newAvgPrice, userId, assetId]
          );
        }
      }
    }
  }

  async getPortfolio(userId: string): Promise<{ holdings: PortfolioItemResponse[]; usdcBalance: number }> {
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
    let usdcBalance = 0;

    for (const row of portfolio.rows) {
      const symbol = row.asset_symbol;
      const quantity = parseFloat(row.quantity);
      const avgBuyingPrice = parseFloat(row.avg_buying_price);

      // Track USDC balance separately
      if (symbol === 'USDC') {
        usdcBalance = quantity;
        continue; // Skip USDC from holdings list (it's shown separately)
      }

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

    return { holdings, usdcBalance };
  }

  /**
   * Get the balance of a specific asset for a user
   * @param userId - User ID
   * @param assetSymbol - Asset symbol (e.g., 'BTC', 'ETH', 'USDC')
   * @returns Balance amount (0 if no position exists)
   */
  async getAssetBalance(userId: string, assetSymbol: string): Promise<number> {
    const result = await db.query(
      `SELECT p.quantity
       FROM portfolio p
       JOIN assets a ON p.asset_id = a.id
       WHERE p.user_id = $1 AND a.symbol = $2`,
      [userId, assetSymbol]
    );

    if (result.rows.length === 0) {
      return 0;
    }

    return parseFloat(result.rows[0].quantity);
  }

  /**
   * Update USDC balance when buying or selling
   * When buying: deduct USDC (subtract quote_quantity)
   * When selling: add USDC (add quote_quantity)
   */
  async updateUSDCBalance(
    userId: string,
    usdcAssetId: string,
    quoteQuantity: number,
    side: 'buy' | 'sell'
  ): Promise<void> {
    // Get current USDC position
    const currentPosition = await db.query(
      'SELECT * FROM portfolio WHERE user_id = $1 AND asset_id = $2',
      [userId, usdcAssetId]
    );

    if (currentPosition.rows.length === 0) {
      // No existing USDC position
      if (side === 'sell') {
        // Selling adds USDC to portfolio
        await db.query(
          `INSERT INTO portfolio (user_id, asset_id, quantity, avg_buying_price)
           VALUES ($1, $2, $3, 1)`,
          [userId, usdcAssetId, quoteQuantity]
        );
      } else {
        // Buying without USDC - should have been validated, but handle gracefully
        throw new Error('Insufficient USDC balance');
      }
    } else {
      const current = currentPosition.rows[0];
      const currentQuantity = parseFloat(current.quantity);

      if (side === 'buy') {
        // Deduct USDC when buying
        const newQuantity = currentQuantity - quoteQuantity;
        if (newQuantity < 0) {
          throw new Error('Insufficient USDC balance');
        }

        if (newQuantity === 0) {
          // Remove position if quantity becomes zero
          await db.query(
            'DELETE FROM portfolio WHERE user_id = $1 AND asset_id = $2',
            [userId, usdcAssetId]
          );
        } else {
          await db.query(
            `UPDATE portfolio 
             SET quantity = $1, updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $2 AND asset_id = $3`,
            [newQuantity, userId, usdcAssetId]
          );
        }
      } else {
        // Add USDC when selling
        const newQuantity = currentQuantity + quoteQuantity;
        // For USDC, avg_buying_price stays at 1 (since USDC ≈ $1)
        await db.query(
          `UPDATE portfolio 
           SET quantity = $1, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $2 AND asset_id = $3`,
          [newQuantity, userId, usdcAssetId]
        );
      }
    }
  }

  /**
   * Add or withdraw USDC from user's portfolio
   * @param userId - User ID
   * @param usdcAssetId - USDC asset ID
   * @param amount - Amount to add or withdraw
   * @param action - 'add' to add USDC, 'withdraw' to withdraw USDC
   * @returns New USDC balance
   */
  async updateUSDCBalanceDirect(
    userId: string,
    usdcAssetId: string,
    amount: number,
    action: 'add' | 'withdraw'
  ): Promise<number> {
    // Get current USDC position
    const currentPosition = await db.query(
      'SELECT * FROM portfolio WHERE user_id = $1 AND asset_id = $2',
      [userId, usdcAssetId]
    );

    if (currentPosition.rows.length === 0) {
      // No existing USDC position
      if (action === 'add') {
        // Add USDC
        await db.query(
          `INSERT INTO portfolio (user_id, asset_id, quantity, avg_buying_price)
           VALUES ($1, $2, $3, 1)`,
          [userId, usdcAssetId, amount]
        );
        return amount;
      } else {
        // Can't withdraw what you don't have
        throw new Error('Insufficient USDC balance');
      }
    } else {
      const current = currentPosition.rows[0];
      const currentQuantity = parseFloat(current.quantity);

      if (action === 'add') {
        // Add USDC
        const newQuantity = currentQuantity + amount;
        await db.query(
          `UPDATE portfolio 
           SET quantity = $1, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $2 AND asset_id = $3`,
          [newQuantity, userId, usdcAssetId]
        );
        return newQuantity;
      } else {
        // Withdraw USDC
        const newQuantity = currentQuantity - amount;
        if (newQuantity < 0) {
          throw new Error(`Insufficient USDC balance. Available: ${currentQuantity}, Requested: ${amount}`);
        }

        if (newQuantity === 0) {
          // Remove position if quantity becomes zero
          await db.query(
            'DELETE FROM portfolio WHERE user_id = $1 AND asset_id = $2',
            [userId, usdcAssetId]
          );
        } else {
          await db.query(
            `UPDATE portfolio 
             SET quantity = $1, updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $2 AND asset_id = $3`,
            [newQuantity, userId, usdcAssetId]
          );
        }
        return newQuantity;
      }
    }
  }
}

export const portfolioService = new PortfolioService();

