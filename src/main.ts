import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  await import('temporal-polyfill/full/global');

  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.enableCors({
    origin: (
      process.env.CORS_ORIGINS || 'http://localhost:8080,http://127.0.0.1:8080'
    )
      .split(',')
      .map((value) => value.trim()),
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Momtaz Hijab API')
    .setDescription('API documentation for the Momtaz Hijab ecommerce service')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const documentFactory = () =>
    SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('docs', app, documentFactory, {
    jsonDocumentUrl: 'docs-json',
    customSiteTitle: 'Momtaz Hijab API Docs',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(Number(process.env.PORT) || 3000, '0.0.0.0');
}
void bootstrap();
