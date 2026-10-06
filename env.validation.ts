import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class EnvironmentVariables {
  @IsNotEmpty()
  @IsString()
  CORS_ORIGINS!: string;

  @IsNotEmpty()
  @IsString()
  DATABASE_URL!: string;

  @IsNumber()
  PORT!: number;

  @IsNotEmpty()
  @IsString()
  ACCESS_TOKEN_EXP!: string;

  @IsNotEmpty()
  @IsString()
  REFRESH_TOKEN_EXP!: string;

  @IsNotEmpty()
  @IsString()
  JWT_PUBLIC_KEY!: string;

  @IsNotEmpty()
  @IsString()
  JWT_PRIVATE_KEY!: string;

  @IsString()
  AWS_ACCESS_KEY_ID!: string;

  @IsNotEmpty()
  @IsString()
  AWS_SECRET_ACCESS_KEY!: string;

  @IsNotEmpty()
  @IsString()
  AWS_BUCKET_NAME!: string;

  @IsNotEmpty()
  @IsString()
  AWS_DEFAULT_REGION!: string;

  @IsNotEmpty()
  @IsString()
  PRESIGNED_URL!: string;
}
