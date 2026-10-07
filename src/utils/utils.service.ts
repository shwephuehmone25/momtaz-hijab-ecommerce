import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TokenType, UserRole } from './enums';
import { LoginSignupResponse } from './utils.dto';

type EnvironmentVariables = {
  JWT_PRIVATE_KEY: string;
  ACCESS_TOKEN_EXP: string;
  REFRESH_TOKEN_EXP: string;
};

@Injectable()
export class UtilsService {
  constructor(
    private readonly configService: ConfigService<EnvironmentVariables>,
    private readonly jwtService: JwtService,
  ) {}

  async loginSignupResponse({
    userId,
    name,
    roles,
    email,
  }: {
    userId: number | bigint;
    name: string | null;
    roles: UserRole[];
    email: string | null;
  }): Promise<LoginSignupResponse> {
    const role = roles[0];
    if (!role) {
      throw new InternalServerErrorException('A user role is required');
    }

    const privateKey = this.getRequiredConfig('JWT_PRIVATE_KEY').replace(
      /\\n/g,
      '\n',
    );
    const payload = {
      id: String(userId),
      roles,
    };
    const expiresIn = this.getPositiveIntegerConfig('ACCESS_TOKEN_EXP', 900);

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { ...payload, type: TokenType.ACCESS },
        {
          algorithm: 'ES256',
          expiresIn,
          secret: privateKey,
        },
      ),
      this.jwtService.signAsync(
        { ...payload, type: TokenType.REFRESH },
        {
          algorithm: 'ES256',
          expiresIn: this.getPositiveIntegerConfig('REFRESH_TOKEN_EXP', 604800),
          secret: privateKey,
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn,
      user: {
        id: String(userId),
        name: name ?? '',
        email,
        role,
      },
    };
  }

  private getRequiredConfig(key: keyof EnvironmentVariables): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new InternalServerErrorException(`${key} is not configured`);
    }
    return value;
  }

  private getPositiveIntegerConfig(
    key: keyof EnvironmentVariables,
    fallback: number,
  ): number {
    const value = Number(this.configService.get<string>(key) ?? fallback);
    return Number.isInteger(value) && value > 0 ? value : fallback;
  }
}
