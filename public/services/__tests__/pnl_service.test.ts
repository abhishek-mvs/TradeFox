import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PnLService } from '../pnl_service.js';
import { db } from '../../pkg/db/db.js';
import { portfolioService } from '../portfolio_service.js';

// Mock dependencies
vi.mock('../../pkg/db/db.js');
vi.mock('../portfolio_service.js');

describe('PnLService', () => {
  let pnlService: PnLService;
  const mockDb = db as any;
  const mockPortfolioService = portfolioService as any;

  beforeEach(() => {
    pnlService = new PnLService();
    vi.clearAllMocks();
  });

  describe('calculateRealizedPnL', () => {
    it('should calculate realized PnL correctly for simple buy and sell', async () => {
      const userId = 'test-user-id';
      mockDb.query.mockResolvedValue({
        rows: [
          {
            base_symbol: 'BTC',
            price: '40000',
            base_quantity: '1',
            side: 'buy',
            created_at: new Date('2024-01-01'),
          },
          {
            base_symbol: 'BTC',
            price: '43000',
            base_quantity: '1',
            side: 'sell',
            created_at: new Date('2024-01-02'),
          },
        ],
      });

      const realizedPnL = await pnlService.calculateRealizedPnL(userId);

      // Buy at 40000, sell at 43000 = profit of 3000
      expect(realizedPnL).toBe(3000);
    });

    it('should calculate realized PnL correctly for multiple buys and sells (FIFO)', async () => {
      const userId = 'test-user-id';
      mockDb.query.mockResolvedValue({
        rows: [
          {
            base_symbol: 'BTC',
            price: '40000',
            base_quantity: '1',
            side: 'buy',
            created_at: new Date('2024-01-01'),
          },
          {
            base_symbol: 'BTC',
            price: '42000',
            base_quantity: '1',
            side: 'buy',
            created_at: new Date('2024-01-02'),
          },
          {
            base_symbol: 'BTC',
            price: '43000',
            base_quantity: '1',
            side: 'sell',
            created_at: new Date('2024-01-03'),
          },
        ],
      });

      const realizedPnL = await pnlService.calculateRealizedPnL(userId);

      // First buy at 40000, sell at 43000 = profit of 3000
      expect(realizedPnL).toBe(3000);
    });

    it('should calculate realized PnL correctly for partial sell', async () => {
      const userId = 'test-user-id';
      mockDb.query.mockResolvedValue({
        rows: [
          {
            base_symbol: 'BTC',
            price: '40000',
            base_quantity: '2',
            side: 'buy',
            created_at: new Date('2024-01-01'),
          },
          {
            base_symbol: 'BTC',
            price: '43000',
            base_quantity: '1',
            side: 'sell',
            created_at: new Date('2024-01-02'),
          },
        ],
      });

      const realizedPnL = await pnlService.calculateRealizedPnL(userId);

      // Buy 2 at 40000, sell 1 at 43000 = profit of 3000
      expect(realizedPnL).toBe(3000);
    });

    it('should calculate realized PnL correctly for multiple assets', async () => {
      const userId = 'test-user-id';
      mockDb.query.mockResolvedValue({
        rows: [
          {
            base_symbol: 'BTC',
            price: '40000',
            base_quantity: '1',
            side: 'buy',
            created_at: new Date('2024-01-01'),
          },
          {
            base_symbol: 'ETH',
            price: '2000',
            base_quantity: '1',
            side: 'buy',
            created_at: new Date('2024-01-02'),
          },
          {
            base_symbol: 'BTC',
            price: '43000',
            base_quantity: '1',
            side: 'sell',
            created_at: new Date('2024-01-03'),
          },
          {
            base_symbol: 'ETH',
            price: '2200',
            base_quantity: '1',
            side: 'sell',
            created_at: new Date('2024-01-04'),
          },
        ],
      });

      const realizedPnL = await pnlService.calculateRealizedPnL(userId);

      // BTC: buy 40000, sell 43000 = +3000
      // ETH: buy 2000, sell 2200 = +200
      // Total: 3200
      expect(realizedPnL).toBe(3200);
    });

    it('should calculate negative realized PnL for loss', async () => {
      const userId = 'test-user-id';
      mockDb.query.mockResolvedValue({
        rows: [
          {
            base_symbol: 'BTC',
            price: '40000',
            base_quantity: '1',
            side: 'buy',
            created_at: new Date('2024-01-01'),
          },
          {
            base_symbol: 'BTC',
            price: '38000',
            base_quantity: '1',
            side: 'sell',
            created_at: new Date('2024-01-02'),
          },
        ],
      });

      const realizedPnL = await pnlService.calculateRealizedPnL(userId);

      // Buy at 40000, sell at 38000 = loss of -2000
      expect(realizedPnL).toBe(-2000);
    });

    it('should handle multiple sells against same buy position', async () => {
      const userId = 'test-user-id';
      mockDb.query.mockResolvedValue({
        rows: [
          {
            base_symbol: 'BTC',
            price: '40000',
            base_quantity: '2',
            side: 'buy',
            created_at: new Date('2024-01-01'),
          },
          {
            base_symbol: 'BTC',
            price: '43000',
            base_quantity: '1',
            side: 'sell',
            created_at: new Date('2024-01-02'),
          },
          {
            base_symbol: 'BTC',
            price: '44000',
            base_quantity: '1',
            side: 'sell',
            created_at: new Date('2024-01-03'),
          },
        ],
      });

      const realizedPnL = await pnlService.calculateRealizedPnL(userId);

      // First sell: buy 40000, sell 43000 = +3000
      // Second sell: buy 40000, sell 44000 = +4000
      // Total: 7000
      expect(realizedPnL).toBe(7000);
    });

    it('should return 0 when there are no trades', async () => {
      const userId = 'test-user-id';
      mockDb.query.mockResolvedValue({
        rows: [],
      });

      const realizedPnL = await pnlService.calculateRealizedPnL(userId);

      expect(realizedPnL).toBe(0);
    });

    it('should return 0 when there are only buy orders', async () => {
      const userId = 'test-user-id';
      mockDb.query.mockResolvedValue({
        rows: [
          {
            base_symbol: 'BTC',
            price: '40000',
            base_quantity: '1',
            side: 'buy',
            created_at: new Date('2024-01-01'),
          },
        ],
      });

      const realizedPnL = await pnlService.calculateRealizedPnL(userId);

      expect(realizedPnL).toBe(0);
    });
  });

  describe('calculateUnrealizedPnL', () => {
    it('should calculate unrealized PnL correctly', async () => {
      const userId = 'test-user-id';
      mockPortfolioService.getPortfolio.mockResolvedValue({
        holdings: [
          {
            asset_symbol: 'BTC',
            quantity: 1,
            avg_buying_price: 40000,
            current_price: 44000,
            unrealized_pnl: 4000,
          },
          {
            asset_symbol: 'ETH',
            quantity: 2,
            avg_buying_price: 2000,
            current_price: 2200,
            unrealized_pnl: 400,
          },
        ],
      });

      const unrealizedPnL = await pnlService.calculateUnrealizedPnL(userId);

      // BTC: 4000, ETH: 400 = 4400
      expect(unrealizedPnL).toBe(4400);
    });

    it('should return 0 when portfolio is empty', async () => {
      const userId = 'test-user-id';
      mockPortfolioService.getPortfolio.mockResolvedValue({
        holdings: [],
      });

      const unrealizedPnL = await pnlService.calculateUnrealizedPnL(userId);

      expect(unrealizedPnL).toBe(0);
    });

    it('should handle negative unrealized PnL', async () => {
      const userId = 'test-user-id';
      mockPortfolioService.getPortfolio.mockResolvedValue({
        holdings: [
          {
            asset_symbol: 'BTC',
            quantity: 1,
            avg_buying_price: 40000,
            current_price: 38000,
            unrealized_pnl: -2000,
          },
        ],
      });

      const unrealizedPnL = await pnlService.calculateUnrealizedPnL(userId);

      expect(unrealizedPnL).toBe(-2000);
    });
  });

  describe('getPnL', () => {
    it('should return combined realized and unrealized PnL', async () => {
      const userId = 'test-user-id';
      
      // Mock realized PnL
      mockDb.query.mockResolvedValue({
        rows: [
          {
            base_symbol: 'BTC',
            price: '40000',
            base_quantity: '1',
            side: 'buy',
            created_at: new Date('2024-01-01'),
          },
          {
            base_symbol: 'BTC',
            price: '43000',
            base_quantity: '1',
            side: 'sell',
            created_at: new Date('2024-01-02'),
          },
        ],
      });

      // Mock unrealized PnL
      mockPortfolioService.getPortfolio.mockResolvedValue({
        holdings: [
          {
            asset_symbol: 'ETH',
            quantity: 1,
            avg_buying_price: 2000,
            current_price: 2200,
            unrealized_pnl: 200,
          },
        ],
      });

      const pnl = await pnlService.getPnL(userId);

      expect(pnl.user_id).toBe(userId);
      expect(pnl.realized_pnl).toBe(3000); // BTC profit
      expect(pnl.unrealized_pnl).toBe(200); // ETH unrealized
      expect(pnl.total_pnl).toBe(3200);
    });
  });
});

