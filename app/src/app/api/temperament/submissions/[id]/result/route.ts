import { proxy } from '../../../_proxy';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxy('GET', `/temperament/submissions/${id}/result`);
}
