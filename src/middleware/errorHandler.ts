import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(err.message);
  const body: ApiResponse = { success: false, error: err.message };
  res.status(500).json(body);
}
