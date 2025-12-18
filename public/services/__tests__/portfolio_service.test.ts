import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PortfolioService } from '../portfolio_service.js';
import { db } from '../../pkg/db/db.js';
import { pythClient } from '../../clients/pyth.js';

// Mock dependencies
vi.mock('../../pkg/db/db.js');
vi.mock('../../clients/pyth.js');

describe('PortfolioService', () => {
  let portfolioService: PortfolioService;
  const mockDb = db as any;
  const mockPythClient = pythClient as any;

  beforeEach(() => {
    portfolioService = new PortfolioService();
    vi.clearAllMocks();
  });

  describe('updatePortfolio', () => {
    it('should create new position when buying for the first time', async () => {
      const userId = 'test-user-id';
      const assetId = 'btc-asset-id';
      
      mockDb.query.mockResolvedValueOnce({
        rows: [], // No existing position
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      await portfolioService.updatePortfolio(userId, assetId, 1, 40000, 'buy');

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM portfolio WHERE user_id = $1 AND asset_id = $2',
        [userId, assetId]
      );
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO portfolio'),
        [userId, assetId, 1, 40000]
      );
    });

    it('should update position with weighted average when buying more', async () => {
      const userId = 'test-user-id';
      const assetId = 'btc-asset-id';
      
      // First call: check existing position
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          quantity: '1',
          avg_buying_price: '40000',
        }],
      });

      // Second call: update position
      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      await portfolioService.updatePortfolio(userId, assetId, 1, 42000, 'buy');

      // Expected: (1 * 40000 + 1 * 42000) / 2 = 41000
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE portfolio'),
        expect.arrayContaining([2, 41000, userId, assetId])
      );
    });

    it('should reduce quantity when selling', async () => {
      const userId = 'test-user-id';
      const assetId = 'btc-asset-id';
      
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          quantity: '2',
          avg_buying_price: '40000',
        }],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      await portfolioService.updatePortfolio(userId, assetId, 1, 43000, 'sell');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE portfolio'),
        expect.arrayContaining([1, userId, assetId])
      );
    });

    it('should delete position when selling all quantity', async () => {
      const userId = 'test-user-id';
      const assetId = 'btc-asset-id';
      
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          quantity: '1',
          avg_buying_price: '40000',
        }],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      await portfolioService.updatePortfolio(userId, assetId, 1, 43000, 'sell');

      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM portfolio WHERE user_id = $1 AND asset_id = $2',
        [userId, assetId]
      );
    });

    it('should throw error when selling without position', async () => {
      const userId = 'test-user-id';
      const assetId = 'btc-asset-id';
      
      mockDb.query.mockResolvedValueOnce({
        rows: [], // No existing position
      });

      await expect(
        portfolioService.updatePortfolio(userId, assetId, 1, 43000, 'sell')
      ).rejects.toThrow('Insufficient balance for sell order');
    });

    it('should throw error when selling more than available', async () => {
      const userId = 'test-user-id';
      const assetId = 'btc-asset-id';
      
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          quantity: '1',
          avg_buying_price: '40000',
        }],
      });

      await expect(
        portfolioService.updatePortfolio(userId, assetId, 2, 43000, 'sell')
      ).rejects.toThrow('Insufficient balance for sell order');
    });
  });

  describe('getPortfolio', () => {
    it('should return portfolio with holdings and USDC balance', async () => {
      const userId = 'test-user-id';
      
      mockDb.query.mockResolvedValue({
        rows: [
          {
            asset_symbol: 'BTC',
            quantity: '1',
            avg_buying_price: '40000',
          },
          {
            asset_symbol: 'USDC',
            quantity: '10000',
            avg_buying_price: '1',
          },
        ],
      });

      mockPythClient.getPrice.mockResolvedValue(44000);

      const portfolio = await portfolioService.getPortfolio(userId);

      expect(portfolio.usdcBalance).toBe(10000);
      expect(portfolio.holdings).toHaveLength(1);
      expect(portfolio.holdings[0].asset_symbol).toBe('BTC');
      expect(portfolio.holdings[0].quantity).toBe(1);
      expect(portfolio.holdings[0].avg_buying_price).toBe(40000);
      expect(portfolio.holdings[0].current_price).toBe(44000);
      expect(portfolio.holdings[0].unrealized_pnl).toBe(4000); // (44000 - 40000) * 1
    });

    it('should return empty portfolio when user has no holdings', async () => {
      const userId = 'test-user-id';
      
      mockDb.query.mockResolvedValue({
        rows: [],
      });

      const portfolio = await portfolioService.getPortfolio(userId);

      expect(portfolio.usdcBalance).toBe(0);
      expect(portfolio.holdings).toHaveLength(0);
    });

    it('should calculate unrealized PnL correctly for multiple assets', async () => {
      const userId = 'test-user-id';
      
      mockDb.query.mockResolvedValue({
        rows: [
          {
            asset_symbol: 'BTC',
            quantity: '1',
            avg_buying_price: '40000',
          },
          {
            asset_symbol: 'ETH',
            quantity: '2',
            avg_buying_price: '2000',
          },
        ],
      });

      mockPythClient.getPrice
        .mockResolvedValueOnce(44000) // BTC price
        .mockResolvedValueOnce(2200); // ETH price

      const portfolio = await portfolioService.getPortfolio(userId);

      expect(portfolio.holdings).toHaveLength(2);
      
      const btcHolding = portfolio.holdings.find(h => h.asset_symbol === 'BTC');
      expect(btcHolding?.unrealized_pnl).toBe(4000); // (44000 - 40000) * 1
      
      const ethHolding = portfolio.holdings.find(h => h.asset_symbol === 'ETH');
      expect(ethHolding?.unrealized_pnl).toBe(400); // (2200 - 2000) * 2
    });

    it('should handle negative unrealized PnL', async () => {
      const userId = 'test-user-id';
      
      mockDb.query.mockResolvedValue({
        rows: [
          {
            asset_symbol: 'BTC',
            quantity: '1',
            avg_buying_price: '40000',
          },
        ],
      });

      mockPythClient.getPrice.mockResolvedValue(38000);

      const portfolio = await portfolioService.getPortfolio(userId);

      expect(portfolio.holdings[0].unrealized_pnl).toBe(-2000); // (38000 - 40000) * 1
    });
  });

  describe('getAssetBalance', () => {
    it('should return balance for existing asset', async () => {
      const userId = 'test-user-id';
      
      mockDb.query.mockResolvedValue({
        rows: [{
          quantity: '1.5',
        }],
      });

      const balance = await portfolioService.getAssetBalance(userId, 'BTC');

      expect(balance).toBe(1.5);
    });

    it('should return 0 when asset has no balance', async () => {
      const userId = 'test-user-id';
      
      mockDb.query.mockResolvedValue({
        rows: [],
      });

      const balance = await portfolioService.getAssetBalance(userId, 'BTC');

      expect(balance).toBe(0);
    });
  });

  describe('updateUSDCBalance', () => {
    it('should add USDC when action is add', async () => {
      const userId = 'test-user-id';
      const usdcAssetId = 'usdc-asset-id';
      
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          quantity: '1000',
        }],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      const newBalance = await portfolioService.updateUSDCBalanceDirect(
        userId,
        usdcAssetId,
        500,
        'add'
      );

      expect(newBalance).toBe(1500);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE portfolio'),
        expect.arrayContaining([1500, userId, usdcAssetId])
      );
    });

    it('should create new USDC position when adding for the first time', async () => {
      const userId = 'test-user-id';
      const usdcAssetId = 'usdc-asset-id';
      
      mockDb.query.mockResolvedValueOnce({
        rows: [], // No existing position
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      const newBalance = await portfolioService.updateUSDCBalanceDirect(
        userId,
        usdcAssetId,
        1000,
        'add'
      );

      expect(newBalance).toBe(1000);
      // Check that INSERT was called (it's the second call after SELECT)
      const insertCall = mockDb.query.mock.calls.find(
        (call: any[]) => call[0].includes('INSERT INTO portfolio')
      );
      expect(insertCall).toBeDefined();
      // The query has avg_buying_price hardcoded as 1, so only 3 parameters
      expect(insertCall[1]).toEqual([userId, usdcAssetId, 1000]);
    });

    it('should withdraw USDC when action is withdraw', async () => {
      const userId = 'test-user-id';
      const usdcAssetId = 'usdc-asset-id';
      
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          quantity: '1000',
        }],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      const newBalance = await portfolioService.updateUSDCBalanceDirect(
        userId,
        usdcAssetId,
        300,
        'withdraw'
      );

      expect(newBalance).toBe(700);
    });

    it('should delete position when withdrawing all USDC', async () => {
      const userId = 'test-user-id';
      const usdcAssetId = 'usdc-asset-id';
      
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          quantity: '1000',
        }],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      const newBalance = await portfolioService.updateUSDCBalanceDirect(
        userId,
        usdcAssetId,
        1000,
        'withdraw'
      );

      expect(newBalance).toBe(0);
      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM portfolio WHERE user_id = $1 AND asset_id = $2',
        [userId, usdcAssetId]
      );
    });

    it('should throw error when withdrawing more than available', async () => {
      const userId = 'test-user-id';
      const usdcAssetId = 'usdc-asset-id';
      
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          quantity: '1000',
        }],
      });

      await expect(
        portfolioService.updateUSDCBalanceDirect(
          userId,
          usdcAssetId,
          1500,
          'withdraw'
        )
      ).rejects.toThrow('Insufficient USDC balance');
    });

    it('should throw error when withdrawing without position', async () => {
      const userId = 'test-user-id';
      const usdcAssetId = 'usdc-asset-id';
      
      mockDb.query.mockResolvedValueOnce({
        rows: [], // No existing position
      });

      await expect(
        portfolioService.updateUSDCBalanceDirect(
          userId,
          usdcAssetId,
          500,
          'withdraw'
        )
      ).rejects.toThrow('Insufficient USDC balance');
    });
  });
});

