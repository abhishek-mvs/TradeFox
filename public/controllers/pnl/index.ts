import { Request, Response } from 'express';
import { pnlService } from '../../services/pnl_service.js';
import { GetPnLRequestSchema } from '../../utils/serializers.js';

export const getPnL = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = GetPnLRequestSchema.parse(req.body);
    const pnl = await pnlService.getPnL(validatedData.user_id);
    
    res.status(200).json({
      success: true,
      data: pnl,
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
        error: error.message || 'Failed to calculate PnL',
      });
    }
  }
};

