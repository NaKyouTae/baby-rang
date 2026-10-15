/**
 * 이미 올라가 있는 방 꾸미기 이미지를 화면 크기에 맞게 다시 올린다.
 *
 * 업로드 시 리사이즈가 생기기 전의 아이템은 원본(1000px 이상, 장당 1MB 안팎)에
 * Cache-Control 도 no-cache 라서 홈에서 벽지·바닥이 늦게 떴다.
 * 이 스크립트는 그런 아이템을 WebP 로 줄여 새 키로 올리고 imageUrl 만 바꾼다.
 *
 * 원본 파일은 지우지 않는다 — 기기에 저장된 예전 주소가 남아 있어도 깨지지 않게.
 *
 * 실행:
 *   cd server && npx ts-node prisma/optimize-room-item-images.ts           # 바꿀 목록만 출력
 *   cd server && npx ts-node prisma/optimize-room-item-images.ts --apply   # 실제로 올리고 DB 반영
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import pg from 'pg';
import { optimizeSprite } from '../src/storage/storage.service';

const apply = process.argv.includes('--apply');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const bucket = process.env.SUPABASE_S3_BUCKET!;
const publicUrl = process.env.SUPABASE_PUBLIC_URL!;
const s3 = new S3Client({
  region: 'ap-northeast-2',
  endpoint: process.env.SUPABASE_S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.SUPABASE_ACCESS_KEY!,
    secretAccessKey: process.env.SUPABASE_SECRET_KEY!,
  },
  forcePathStyle: true,
});

async function main() {
  const items = await prisma.roomItem.findMany({
    where: { imageUrl: { not: null } },
    select: { id: true, name: true, imageUrl: true },
  });
  // 이미 줄인 것(.webp)은 건너뛴다. 두 번 돌려도 안전하다.
  const targets = items.filter((i) => !i.imageUrl!.endsWith('.webp'));
  console.log(
    `대상 ${targets.length}개 / 전체 ${items.length}개${apply ? '' : ' (미리보기, --apply 로 실행)'}`,
  );

  for (const item of targets) {
    const res = await fetch(item.imageUrl!);
    if (!res.ok) {
      console.warn(`  건너뜀 ${item.name}: 원본을 받지 못함 (${res.status})`);
      continue;
    }
    const original = Buffer.from(await res.arrayBuffer());
    const webp = await optimizeSprite(original);
    const kb = (n: number) => `${Math.round(n / 1024)}KB`;
    console.log(`  ${item.name}: ${kb(original.length)} → ${kb(webp.length)}`);
    if (!apply) continue;

    const key = `room-items/${randomUUID()}.webp`;
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: webp,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
    await prisma.roomItem.update({
      where: { id: item.id },
      data: { imageUrl: `${publicUrl}/${bucket}/${key}` },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
