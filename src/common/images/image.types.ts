export type ImageUploadFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

export type UploadedImage = {
  url: string;
  key: string;
  contentType: string;
  bytes: number;
};
