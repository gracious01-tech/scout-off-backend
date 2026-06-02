import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiResponse } from '../types';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const correlationId = req.correlationId;

  if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
    const body: ApiResponse = { 
      success: false, 
      error: 'Malformed JSON payload',
      correlationId 
    };
    res.status(400).json(body);
    return;
  }

  if (err instanceof ZodError) {
    const body: ApiResponse = { 
      success: false, 
      error: err.errors[0]?.message ?? 'Validation error',
      correlationId 
    };
    res.status(400).json(body);
    return;
  }

  const body: ApiResponse = { 
    success: false, 
    error: err.message,
    correlationId 
  };
  res.status(500).json(body);
}
