import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TradeService } from '../trade_service.js';
import { db } from '../../pkg/db/db.js';
import { portfolioService } from '../portfolio_service.js';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies
vi.mock('../../pkg/db/db.js');
vi.mock('../portfolio_service.js');
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-trade-id-123'),
}));

describe('TradeService', () => {
  let tradeService: TradeService;
  const mockDb = db as any;
  const mockPortfolioService = portfolioService as any;

  beforeEach(() => {
    tradeService = new TradeService();
    vi.clearAllMocks();
  });

  describe('createOrder', () => {
    const baseAssetId = 'btc-asset-id';
    const quoteAssetId = 'usdc-asset-id';
    const userId = 'test-user-id';

    it('should create a buy order successfully', async () => {
      const request = {
        user_id: userId,
        base_symbol: 'BTC',
        quote_symbol: 'USDC' as const,
        price: 40000,
        base_quantity: 1,
        side: 'buy' as const,
      };

      // Mock asset lookups
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: baseAssetId }], // Base asset
        })
        .mockResolvedValueOnce({
          rows: [{ id: quoteAssetId }], // Quote asset
        });

      // Mock balance check (sufficient USDC)
      mockPortfolioService.getAssetBalance.mockResolvedValue(50000);

      // Mock trade creation
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      // Mock portfolio updates
      mockPortfolioService.updatePortfolio.mockResolvedValue(undefined);
      mockPortfolioService.updateUSDCBalance.mockResolvedValue(undefined);

      // Mock getTradeById (called at the end)
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'mock-trade-id-123',
            user_id: userId,
            base_symbol: 'BTC',
            quote_symbol: 'USDC',
            price: '40000',
            base_quantity: '1',
            quote_quantity: '40000',
            side: 'buy',
            status: 'EXECUTED',
            created_at: new Date('2024-01-01'),
          },
        ],
      });

      const result = await tradeService.createOrder(request);

      // Verify asset lookups
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT id FROM assets WHERE symbol = $1',
        ['BTC']
      );
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT id FROM assets WHERE symbol = $1',
        ['USDC']
      );

      // Verify balance check
      expect(mockPortfolioService.getAssetBalance).toHaveBeenCalledWith(
        userId,
        'USDC'
      );

      // Verify trade creation
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO trades'),
        expect.arrayContaining([
          'mock-trade-id-123',
          userId,
          baseAssetId,
          quoteAssetId,
          40000,
          1,
          40000, // quote_quantity
          'buy',
        ])
      );

      // Verify portfolio updates
      expect(mockPortfolioService.updatePortfolio).toHaveBeenCalledWith(
        userId,
        baseAssetId,
        1,
        40000,
        'buy'
      );
      expect(mockPortfolioService.updateUSDCBalance).toHaveBeenCalledWith(
        userId,
        quoteAssetId,
        40000,
        'buy'
      );

      // Verify result
      expect(result.id).toBe('mock-trade-id-123');
      expect(result.side).toBe('buy');
      expect(result.price).toBe(40000);
      expect(result.base_quantity).toBe(1);
      expect(result.quote_quantity).toBe(40000);
    });

    it('should create a sell order successfully', async () => {
      const request = {
        user_id: userId,
        base_symbol: 'BTC',
        quote_symbol: 'USDC' as const,
        price: 43000,
        base_quantity: 1,
        side: 'sell' as const,
      };

      // Mock asset lookups
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: baseAssetId }], // Base asset
        })
        .mockResolvedValueOnce({
          rows: [{ id: quoteAssetId }], // Quote asset
        });

      // Mock balance check (sufficient BTC)
      mockPortfolioService.getAssetBalance.mockResolvedValue(2);

      // Mock trade creation
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      // Mock portfolio updates
      mockPortfolioService.updatePortfolio.mockResolvedValue(undefined);
      mockPortfolioService.updateUSDCBalance.mockResolvedValue(undefined);

      // Mock getTradeById
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'mock-trade-id-123',
            user_id: userId,
            base_symbol: 'BTC',
            quote_symbol: 'USDC',
            price: '43000',
            base_quantity: '1',
            quote_quantity: '43000',
            side: 'sell',
            status: 'EXECUTED',
            created_at: new Date('2024-01-01'),
          },
        ],
      });

      const result = await tradeService.createOrder(request);

      // Verify balance check for base asset
      expect(mockPortfolioService.getAssetBalance).toHaveBeenCalledWith(
        userId,
        'BTC'
      );

      // Verify portfolio updates
      expect(mockPortfolioService.updatePortfolio).toHaveBeenCalledWith(
        userId,
        baseAssetId,
        1,
        43000,
        'sell'
      );
      expect(mockPortfolioService.updateUSDCBalance).toHaveBeenCalledWith(
        userId,
        quoteAssetId,
        43000,
        'sell'
      );

      expect(result.side).toBe('sell');
      expect(result.price).toBe(43000);
    });

    it('should throw error when base asset not found', async () => {
      const request = {
        user_id: userId,
        base_symbol: 'INVALID',
        quote_symbol: 'USDC' as const,
        price: 40000,
        base_quantity: 1,
        side: 'buy' as const,
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [], // Base asset not found
      });

      await expect(tradeService.createOrder(request)).rejects.toThrow(
        'Base asset INVALID not found'
      );
    });

    it('should throw error when quote asset not found', async () => {
      const request = {
        user_id: userId,
        base_symbol: 'BTC',
        quote_symbol: 'USDC' as const,
        price: 40000,
        base_quantity: 1,
        side: 'buy' as const,
      };

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: baseAssetId }], // Base asset found
        })
        .mockResolvedValueOnce({
          rows: [], // Quote asset not found (USDC not in database)
        });

      await expect(tradeService.createOrder(request)).rejects.toThrow(
        'Quote asset USDC not found'
      );
    });

    it('should throw error when insufficient USDC balance for buy order', async () => {
      const request = {
        user_id: userId,
        base_symbol: 'BTC',
        quote_symbol: 'USDC' as const,
        price: 40000,
        base_quantity: 1,
        side: 'buy' as const,
      };

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: baseAssetId }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: quoteAssetId }],
        });

      // Insufficient USDC balance
      mockPortfolioService.getAssetBalance.mockResolvedValue(10000);

      await expect(tradeService.createOrder(request)).rejects.toThrow(
        'Insufficient USDC balance'
      );
    });

    it('should throw error when insufficient base asset balance for sell order', async () => {
      const request = {
        user_id: userId,
        base_symbol: 'BTC',
        quote_symbol: 'USDC' as const,
        price: 43000,
        base_quantity: 2,
        side: 'sell' as const,
      };

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: baseAssetId }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: quoteAssetId }],
        });

      // Insufficient BTC balance
      mockPortfolioService.getAssetBalance.mockResolvedValue(1);

      await expect(tradeService.createOrder(request)).rejects.toThrow(
        'Insufficient BTC balance'
      );
    });

    it('should calculate quote_quantity correctly', async () => {
      const request = {
        user_id: userId,
        base_symbol: 'BTC',
        quote_symbol: 'USDC' as const,
        price: 40000,
        base_quantity: 1.5,
        side: 'buy' as const,
      };

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: baseAssetId }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: quoteAssetId }],
        });

      mockPortfolioService.getAssetBalance.mockResolvedValue(100000);
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockPortfolioService.updatePortfolio.mockResolvedValue(undefined);
      mockPortfolioService.updateUSDCBalance.mockResolvedValue(undefined);

      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'mock-trade-id-123',
            user_id: userId,
            base_symbol: 'BTC',
            quote_symbol: 'USDC',
            price: '40000',
            base_quantity: '1.5',
            quote_quantity: '60000', // 40000 * 1.5
            side: 'buy',
            status: 'EXECUTED',
            created_at: new Date('2024-01-01'),
          },
        ],
      });

      const result = await tradeService.createOrder(request);

      // Verify quote_quantity was calculated correctly
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO trades'),
        expect.arrayContaining([60000]) // quote_quantity = 40000 * 1.5
      );

      expect(result.quote_quantity).toBe(60000);
    });
  });

  describe('getOrdersByUserId', () => {
    it('should return all orders for a user', async () => {
      const userId = 'test-user-id';

      mockDb.query.mockResolvedValue({
        rows: [
          {
            id: 'trade-1',
            user_id: userId,
            base_symbol: 'BTC',
            quote_symbol: 'USDC',
            price: '40000',
            base_quantity: '1',
            quote_quantity: '40000',
            side: 'buy',
            status: 'EXECUTED',
            created_at: new Date('2024-01-02'),
          },
          {
            id: 'trade-2',
            user_id: userId,
            base_symbol: 'BTC',
            quote_symbol: 'USDC',
            price: '42000',
            base_quantity: '1',
            quote_quantity: '42000',
            side: 'buy',
            status: 'EXECUTED',
            created_at: new Date('2024-01-01'),
          },
        ],
      });

      const result = await tradeService.getOrdersByUserId(userId);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [userId]
      );

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('trade-1');
      expect(result[0].base_symbol).toBe('BTC');
      expect(result[0].price).toBe(40000);
      expect(result[0].base_quantity).toBe(1);
      expect(result[0].quote_quantity).toBe(40000);
      expect(result[0].side).toBe('buy');
      expect(result[0].status).toBe('EXECUTED');
      expect(result[0].created_at).toBeDefined();

      // Verify orders are sorted by created_at DESC
      expect(new Date(result[0].created_at).getTime()).toBeGreaterThan(
        new Date(result[1].created_at).getTime()
      );
    });

    it('should return empty array when user has no orders', async () => {
      const userId = 'test-user-id';

      mockDb.query.mockResolvedValue({
        rows: [],
      });

      const result = await tradeService.getOrdersByUserId(userId);

      expect(result).toHaveLength(0);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should parse numeric fields correctly', async () => {
      const userId = 'test-user-id';

      mockDb.query.mockResolvedValue({
        rows: [
          {
            id: 'trade-1',
            user_id: userId,
            base_symbol: 'BTC',
            quote_symbol: 'USDC',
            price: '40000.50',
            base_quantity: '1.5',
            quote_quantity: '60000.75',
            side: 'buy',
            status: 'EXECUTED',
            created_at: new Date('2024-01-01'),
          },
        ],
      });

      const result = await tradeService.getOrdersByUserId(userId);

      expect(result[0].price).toBe(40000.5);
      expect(result[0].base_quantity).toBe(1.5);
      expect(result[0].quote_quantity).toBe(60000.75);
    });
  });

  describe('getTradeById', () => {
    it('should return trade by ID', async () => {
      const tradeId = 'trade-123';
      const userId = 'test-user-id';

      mockDb.query.mockResolvedValue({
        rows: [
          {
            id: tradeId,
            user_id: userId,
            base_symbol: 'BTC',
            quote_symbol: 'USDC',
            price: '40000',
            base_quantity: '1',
            quote_quantity: '40000',
            side: 'buy',
            status: 'EXECUTED',
            created_at: new Date('2024-01-01'),
          },
        ],
      });

      const result = await tradeService.getTradeById(tradeId);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [tradeId]
      );

      expect(result.id).toBe(tradeId);
      expect(result.user_id).toBe(userId);
      expect(result.base_symbol).toBe('BTC');
      expect(result.quote_symbol).toBe('USDC');
      expect(result.price).toBe(40000);
      expect(result.base_quantity).toBe(1);
      expect(result.quote_quantity).toBe(40000);
      expect(result.side).toBe('buy');
      expect(result.status).toBe('EXECUTED');
      expect(result.created_at).toBeDefined();
      expect(typeof result.created_at).toBe('string'); // ISO string
    });

    it('should throw error when trade not found', async () => {
      const tradeId = 'non-existent-trade';

      mockDb.query.mockResolvedValue({
        rows: [],
      });

      await expect(tradeService.getTradeById(tradeId)).rejects.toThrow(
        'Trade with id non-existent-trade not found'
      );
    });

    it('should handle sell orders correctly', async () => {
      const tradeId = 'trade-sell-123';
      const userId = 'test-user-id';

      mockDb.query.mockResolvedValue({
        rows: [
          {
            id: tradeId,
            user_id: userId,
            base_symbol: 'BTC',
            quote_symbol: 'USDC',
            price: '43000',
            base_quantity: '1',
            quote_quantity: '43000',
            side: 'sell',
            status: 'EXECUTED',
            created_at: new Date('2024-01-02'),
          },
        ],
      });

      const result = await tradeService.getTradeById(tradeId);

      expect(result.side).toBe('sell');
      expect(result.price).toBe(43000);
    });
  });
});

