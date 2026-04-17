import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

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
    const key = `${folder}/${randomUUID()}.${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
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
