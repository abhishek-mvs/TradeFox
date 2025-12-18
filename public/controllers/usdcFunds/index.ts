import { Request, Response } from 'express';
import { portfolioService } from '../../services/portfolio_service.js';
import { db } from '../../pkg/db/db.js';
import {
  UpdateUSDCBalanceRequestSchema,
  UpdateUSDCBalanceResponse,
} from '../../utils/serializers.js';

export const updateUSDCBalance = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = UpdateUSDCBalanceRequestSchema.parse(req.body);

    // Get USDC asset ID
    const usdcAsset = await db.query(
      'SELECT id FROM assets WHERE symbol = $1',
      ['USDC']
    );

    if (usdcAsset.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'USDC asset not found',
      });
      return;
    }

    const usdcAssetId = usdcAsset.rows[0].id;

    // Update USDC balance
    const newBalance = await portfolioService.updateUSDCBalanceDirect(
      validatedData.user_id,
      usdcAssetId,
      validatedData.amount,
      validatedData.action
    );

    const response: UpdateUSDCBalanceResponse = {
      user_id: validatedData.user_id,
      usdc_balance: newBalance,
      action: validatedData.action,
      amount: validatedData.amount,
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
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update USDC balance',
      });
    }
  }
};

