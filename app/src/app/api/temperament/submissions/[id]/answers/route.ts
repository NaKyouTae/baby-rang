import { NextRequest } from 'next/server';
import { proxy } from '../../../_proxy';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  return proxy('POST', `/temperament/submissions/${id}/answers`, body);
}
