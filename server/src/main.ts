import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.enableCors({
    origin: [
      'https://baby-rang.spectrify.kr',
      'https://baby-rang-admin.spectrify.kr',
      'http://localhost:13000',
      'http://localhost:18000',
    ],
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 18080);
}
bootstrap();
