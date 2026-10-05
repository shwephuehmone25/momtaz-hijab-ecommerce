import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { RoleName, UserStatus } from './user-enums';

export class CreateUserDto {
  @ApiProperty({ example: 'Store Administrator' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  @MaxLength(100)
  email!: string;

  @ApiProperty({ minLength: 8, writeOnly: true })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiPropertyOptional({ enum: UserStatus, default: UserStatus.ACTIVE })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({
    enum: RoleName,
    isArray: true,
    default: [RoleName.CUSTOMER],
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(RoleName, { each: true })
  roles?: RoleName[];
}
