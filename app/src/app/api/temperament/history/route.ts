import { NextRequest } from 'next/server';
import { proxy } from '../_proxy';

export async function GET(req: NextRequest) {
  const page = req.nextUrl.searchParams.get('page') || '1';
  const limit = req.nextUrl.searchParams.get('limit') || '10';
  return proxy('GET', `/temperament/history?page=${page}&limit=${limit}`);
}
