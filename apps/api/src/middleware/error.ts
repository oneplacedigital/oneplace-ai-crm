import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { logger } from '../config/logger';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: 'NOT_FOUND', message: 'Route not found' });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(422).json({
      error: 'VALIDATION_FAILED',
      message: 'One or more fields are invalid',
      details: err.flatten(),
    });
  }
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      details: err.details,
    });
  }
  const message = err instanceof Error ? err.message : 'Unknown error';
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  return res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : message,
  });
}
