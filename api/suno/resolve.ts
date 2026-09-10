import type { IncomingMessage, ServerResponse } from 'http';
import app from '../../server-app';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  if (!req.url || req.url === '/' || req.url.startsWith('/?')) {
    const query = req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    req.url = '/api/suno/resolve' + query;
  } else if (!req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  return app(req as any, res as any);
}
