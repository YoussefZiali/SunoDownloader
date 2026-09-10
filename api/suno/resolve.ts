import { handleResolveReq } from '../../server-app';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization, Accept, X-Requested-With');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges, Content-Disposition');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  return handleResolveReq(req, res);
}
