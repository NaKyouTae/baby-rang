import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

/**
 * 업로드 파일은 키에 UUID 가 들어가 같은 주소로 다른 내용이 올라올 일이 없다.
 * 그래서 브라우저가 한 번 받은 파일을 다시 묻지 않게 1년 immutable 로 둔다.
 * 이게 없으면 Supabase 기본값(no-cache)이라 홈에 들어올 때마다 이미지를 재검증한다.
 */
const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';

/**
 * 방 꾸미기 스프라이트의 최대 변 길이(px).
 * 캔버스에서는 한 칸이 16px 이고 가장 큰 가구도 수십 px 이다. 꾸미기 시트 썸네일(50px)을
 * 3배 밀도 화면에서 보는 경우까지 넉넉히 잡아도 256 이면 충분하다.
 * 원본(1000px 이상, 장당 1MB 안팎)을 그대로 쓰면 홈 진입 때 벽지·바닥이 늦게 뜬다.
 */
const SPRITE_MAX_PX = 256;

@Injectable()
export class StorageService {
  private s3: S3Client;
  private bucket: string;
  private publicUrl: string;

  constructor(private config: ConfigService) {
    this.bucket = config.get('SUPABASE_S3_BUCKET')!;
    this.publicUrl = config.get('SUPABASE_PUBLIC_URL')!;

    this.s3 = new S3Client({
      region: 'ap-northeast-2',
      endpoint: config.get('SUPABASE_S3_ENDPOINT'),
      credentials: {
        accessKeyId: config.get('SUPABASE_ACCESS_KEY')!,
        secretAccessKey: config.get('SUPABASE_SECRET_KEY')!,
      },
      forcePathStyle: true,
    });
  }

  async upload(file: Express.Multer.File, folder: string): Promise<string> {
    const ext = file.originalname.split('.').pop() || 'jpg';
    return this.put(folder, ext, file.buffer, file.mimetype);
  }

  /**
   * 방 꾸미기 스프라이트 업로드. 화면에 맞는 크기로 줄이고 WebP 로 바꿔 올린다.
   * 투명 배경을 유지해야 해서 JPEG 는 쓰지 않는다.
   */
  async uploadSprite(buffer: Buffer, folder: string): Promise<string> {
    const webp = await optimizeSprite(buffer);
    return this.put(folder, 'webp', webp, 'image/webp');
  }

  private async put(
    folder: string,
    ext: string,
    body: Buffer,
    contentType: string,
  ): Promise<string> {
    const key = `${folder}/${randomUUID()}.${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: IMMUTABLE_CACHE,
      }),
    );

    return `${this.publicUrl}/${this.bucket}/${key}`;
  }

  async delete(url: string): Promise<void> {
    const prefix = `${this.publicUrl}/${this.bucket}/`;
    if (!url.startsWith(prefix)) return;
    const key = url.slice(prefix.length);

    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }
}

/** 긴 변을 SPRITE_MAX_PX 이하로 줄인다. 이미 작으면 키우지 않는다. */
export function optimizeSprite(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(SPRITE_MAX_PX, SPRITE_MAX_PX, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 90, alphaQuality: 100 })
    .toBuffer();
}
