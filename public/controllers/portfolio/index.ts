import { Request, Response } from 'express';
import { portfolioService } from '../../services/portfolio_service.js';
import { GetPortfolioRequestSchema, PortfolioResponse } from '../../utils/serializers.js';

export const getPortfolio = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = GetPortfolioRequestSchema.parse(req.body);
    const { holdings, usdcBalance } = await portfolioService.getPortfolio(validatedData.user_id);
    
    const response: PortfolioResponse = {
      user_id: validatedData.user_id,
      usdc_balance: usdcBalance,
      holdings,
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
        error: error.message || 'Failed to fetch portfolio',
      });
    }
  }
};

