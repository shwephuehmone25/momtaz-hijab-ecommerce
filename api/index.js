import { NestFactory } from '@nestjs/core';
import { AppModule } from '../dist/src/app.module.js';
import { configureApp } from '../dist/src/configure-app.js';
import { initializeDatabase } from '../dist/src/database/db.js';

let serverPromise;

async function createServer() {
  await initializeDatabase();
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  await app.init();
  return app.getHttpAdapter().getInstance();
}

export default async function handler(request, response) {
  serverPromise ??= createServer();
  const server = await serverPromise;
  server(request, response);
}
