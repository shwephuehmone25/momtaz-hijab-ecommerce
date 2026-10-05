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
}
