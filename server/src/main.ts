import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { startMemoryLogger } from './memory-logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.enableCors({
    origin: [
      'https://baby-rang.spectrify.kr',
      'https://baby-rang-admin.spectrify.kr',
      'http://localhost:13000',
      'http://localhost:13001',
    ],
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 18080);

  // 구독 메모리를 얼마로 잡아야 하는지 판단할 근거를 남긴다 — memory-logger.ts 참고
  startMemoryLogger();
}
bootstrap();
