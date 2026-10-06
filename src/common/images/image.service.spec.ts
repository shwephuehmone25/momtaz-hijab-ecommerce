import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ImageService } from './image.service';

describe('ImageService', () => {
  const originalEnvironment = { ...process.env };
  let send: jest.SpyInstance;

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env.AWS_REGION = 'ap-southeast-1';
    process.env.AWS_ACCESS_KEY_ID = 'access-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'secret-key';
    process.env.AWS_S3_BUCKET_NAME = 'images';
    process.env.AWS_S3_PUBLIC_URL = 'https://assets.example.com/';
    delete process.env.AWS_DEFAULT_REGION;
    delete process.env.AWS_BUCKET_NAME;
    delete process.env.PRESIGNED_URL;
    send = jest
      .spyOn(S3Client.prototype, 'send')
      .mockResolvedValue({} as never);
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  it('uploads a category image and returns its public S3 location', async () => {
    const result = await new ImageService().uploadCategoryImage({
      buffer: Buffer.from('image'),
      mimetype: 'image/webp',
      originalname: 'category image.webp',
      size: 5,
    });

    expect(result.contentType).toBe('image/webp');
    expect(result.bytes).toBe(5);
    expect(result.url).toMatch(
      /^https:\/\/assets\.example\.com\/categories\/.+\.webp$/,
    );
    expect(result.key).toMatch(/^categories\/.+\.webp$/);

    const calls = send.mock.calls as unknown[][];
    const command = calls[0]?.[0] as PutObjectCommand;
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toEqual(
      expect.objectContaining({
        Bucket: 'images',
        ContentType: 'image/webp',
        ContentLength: 5,
      }),
    );
  });

  it('supports the existing AWS environment variable aliases', async () => {
    delete process.env.AWS_REGION;
    delete process.env.AWS_S3_BUCKET_NAME;
    delete process.env.AWS_S3_PUBLIC_URL;
    process.env.AWS_DEFAULT_REGION = 'us-east-1';
    process.env.AWS_BUCKET_NAME = 'legacy-images';
    process.env.PRESIGNED_URL = 'https://cdn.example.com';

    const result = await new ImageService().uploadCategoryImage({
      buffer: Buffer.from('image'),
      mimetype: 'image/png',
      originalname: 'category.png',
      size: 5,
    });

    expect(result.url).toMatch(/^https:\/\/cdn\.example\.com\/categories\//);
  });

  it('rejects uploads when S3 is not configured', async () => {
    delete process.env.AWS_REGION;
    delete process.env.AWS_DEFAULT_REGION;

    await expect(
      new ImageService().uploadCategoryImage({
        buffer: Buffer.from('image'),
        mimetype: 'image/png',
        originalname: 'category.png',
        size: 5,
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('translates S3 upload failures', async () => {
    send.mockRejectedValue(new Error('provider failure'));

    await expect(
      new ImageService().uploadCategoryImage({
        buffer: Buffer.from('image'),
        mimetype: 'image/jpeg',
        originalname: 'category.jpg',
        size: 5,
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('deletes an S3 object by key', async () => {
    await new ImageService().deleteImage('categories/abc.webp');

    const calls = send.mock.calls as unknown[][];
    const command = calls[0]?.[0] as DeleteObjectCommand;
    expect(command).toBeInstanceOf(DeleteObjectCommand);
    expect(command.input).toEqual({
      Bucket: 'images',
      Key: 'categories/abc.webp',
    });
  });
});
