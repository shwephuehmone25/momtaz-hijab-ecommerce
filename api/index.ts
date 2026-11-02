import { NestFactory } from '@nestjs/core';
import type { Request, Response } from 'express';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';
import { initializeDatabase } from '../src/database/db.js';

type ExpressApplication = (request: Request, response: Response) => void;

let serverPromise: Promise<ExpressApplication> | undefined;

async function createServer(): Promise<ExpressApplication> {
  await initializeDatabase();
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  await app.init();
  return app.getHttpAdapter().getInstance() as ExpressApplication;
}

export default async function handler(request: Request, response: Response) {
  serverPromise ??= createServer();
  const server = await serverPromise;
  server(request, response);
}
