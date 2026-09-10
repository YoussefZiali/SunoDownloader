import type { IncomingMessage, ServerResponse } from 'http';
import app from '../server-app';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  const forwarded = (req.headers['x-forwarded-url'] as string) || (req.headers['x-matched-path'] as string);
  if (forwarded && forwarded.startsWith('/api')) {
    req.url = forwarded;
  }
  return app(req as any, res as any);
}

