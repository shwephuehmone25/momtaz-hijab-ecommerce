import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import type { ImageUploadFile, UploadedImage } from './image.types';

const imageExtensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

type S3Configuration = { bucket: string; publicUrl: string };

@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name);
  private readonly client: S3Client | null;

  constructor() {
    const region = this.region();
    this.client = region ? new S3Client({ region }) : null;
  }

  async uploadCategoryImage(file: ImageUploadFile): Promise<UploadedImage> {
    const { bucket, publicUrl } = this.requireConfiguration();
    const extension = imageExtensions[file.mimetype];
    if (!extension) {
      throw new BadGatewayException('Unsupported category image type');
    }

    const key = `categories/${randomUUID()}.${extension}`;

    try {
      await this.client!.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ContentLength: file.size,
          CacheControl: 'public, max-age=31536000, immutable',
          Metadata: { originalName: encodeURIComponent(file.originalname) },
        }),
      );

      return {
        url: `${publicUrl}/${key}`,
        key,
        contentType: file.mimetype,
        bytes: file.size,
      };
    } catch (error) {
      const providerError = error as {
        name?: string;
        message?: string;
        $metadata?: { httpStatusCode?: number; requestId?: string };
      };
      this.logger.error('AWS S3 image upload failed', {
        name: providerError.name,
        message: providerError.message,
        statusCode: providerError.$metadata?.httpStatusCode,
        requestId: providerError.$metadata?.requestId,
      });
      throw new BadGatewayException('AWS S3 image upload failed');
    }
  }

  async deleteImage(key: string): Promise<void> {
    const { bucket } = this.requireConfiguration();

    try {
      await this.client!.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: key }),
      );
    } catch {
      throw new BadGatewayException('AWS S3 image deletion failed');
    }
  }

  private requireConfiguration(): S3Configuration {
    const region = this.region();
    const bucket = this.bucket();
    const missingVariables = [
      ...(!region ? ['AWS_REGION or AWS_DEFAULT_REGION'] : []),
      ...(!bucket ? ['AWS_S3_BUCKET_NAME or AWS_BUCKET_NAME'] : []),
    ];

    if (!this.client || !region || !bucket) {
      throw new ServiceUnavailableException(
        `AWS S3 is not configured. Missing: ${missingVariables.join(', ')}`,
      );
    }

    const configuredPublicUrl = (
      process.env.AWS_S3_PUBLIC_URL ?? process.env.PRESIGNED_URL
    )
      ?.trim()
      .replace(/\/$/, '');
    const publicUrl =
      configuredPublicUrl || `https://${bucket}.s3.${region}.amazonaws.com`;
    return { bucket, publicUrl };
  }

  private region() {
    return (process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION)?.trim();
  }

  private bucket() {
    return (
      process.env.AWS_S3_BUCKET_NAME ?? process.env.AWS_BUCKET_NAME
    )?.trim();
  }
}
