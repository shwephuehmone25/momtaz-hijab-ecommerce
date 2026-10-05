import {
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { db } from './db';

@Injectable()
export class DatabaseLifecycleService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  async onApplicationBootstrap(): Promise<void> {
    await db.connect();
  }

  async onApplicationShutdown(): Promise<void> {
    await db.close();
  }
}
