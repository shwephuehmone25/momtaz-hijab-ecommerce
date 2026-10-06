import { ApiProperty } from '@nestjs/swagger';
export class AuthUserResponse {
  @ApiProperty() id!: number;
  @ApiProperty() username!: string;
  @ApiProperty() email!: string;
  @ApiProperty() display_name!: string;
  @ApiProperty() status!: number;
  @ApiProperty() registered_at!: string;
  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        display_name: { type: 'string' },
      },
    },
  })
  roles!: { name: string; display_name: string }[];
  @ApiProperty({ type: [String] }) permissions!: string[];
}
export class TokenResponse {
  @ApiProperty() access_token!: string;
  @ApiProperty() refresh_token!: string;
  @ApiProperty({ example: 'Bearer' }) token_type!: string;
  @ApiProperty({ example: 900 }) expires_in!: number;
}
export class LoginResponse extends TokenResponse {
  @ApiProperty({ type: AuthUserResponse }) user!: AuthUserResponse;
}
