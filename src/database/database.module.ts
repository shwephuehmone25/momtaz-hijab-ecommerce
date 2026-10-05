import { Global, Module } from '@nestjs/common';
import { DatabaseLifecycleService } from './database-lifecycle.service';

@Global()
@Module({
  providers: [DatabaseLifecycleService],
})
export class DatabaseModule {}
