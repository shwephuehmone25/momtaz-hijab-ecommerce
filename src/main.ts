import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';
import { initializeDatabase } from './database/db';

async function bootstrap() {
  await initializeDatabase();

  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  configureApp(app);

  await app.listen(Number(process.env.PORT) || 3000, '0.0.0.0');
}
void bootstrap();
