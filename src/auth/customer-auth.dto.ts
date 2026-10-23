import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CustomerRegistrationDto {
  @ApiProperty({ example: 'Aisha Rahman', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName!: string;

  @ApiProperty({ example: 'aisha@example.com', maxLength: 100 })
  @IsEmail()
  @MaxLength(100)
  email!: string;

  @ApiProperty({ minLength: 8, maxLength: 128, writeOnly: true })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

export class CustomerLoginDto {
  @ApiProperty({ example: 'aisha@example.com', maxLength: 100 })
  @IsEmail()
  @MaxLength(100)
  email!: string;

  @ApiProperty({ minLength: 1, maxLength: 128, writeOnly: true })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}
