import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { UtilsService } from './utils.service';

@Module({
  imports: [ConfigModule, JwtModule.register({})],
  providers: [UtilsService],
  exports: [UtilsService],
})
export class UtilsModule {}
