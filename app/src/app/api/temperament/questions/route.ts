import { NextRequest } from 'next/server';
import { proxy } from '../_proxy';

export async function GET(req: NextRequest) {
  const ageGroup = req.nextUrl.searchParams.get('ageGroup') || 'after_first';
  return proxy('GET', `/temperament/questions?ageGroup=${encodeURIComponent(ageGroup)}`);
}
