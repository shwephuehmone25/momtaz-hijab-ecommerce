import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function configureApp(app: INestApplication) {
  app.enableCors({
    origin: (
      process.env.CORS_ORIGINS ||
      'http://localhost:8080,http://127.0.0.1:8080'
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
}
