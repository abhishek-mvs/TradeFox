import { Request, Response } from 'express';

export const health = (req: Request, res: Response): void => {
  res.status(200).json({ 
    status: "OK",
    message: "Service is healthy",
    timestamp: new Date().toISOString()
  });
};

