import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { startMemoryLogger } from './memory-logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.enableCors({
    origin: [
      'https://babyroom.spectrify.kr',
      'https://babyroom-admin.spectrify.kr',
      // 예전 도메인. 스토어에 나간 앱들은 WebView 시작 주소가 각 빌드에 박혀 있어
      // 업데이트하지 않는 한 영원히 이쪽으로 들어온다. 그 호스트를 리다이렉트가 아니라
      // 같은 앱을 띄우는 별칭으로 두면 오리진도 예전 도메인이 되므로 함께 허용한다.
      'https://baby-rang.spectrify.kr',
      'https://baby-rang-admin.spectrify.kr',
      'http://localhost:13000',
      'http://localhost:13001',
      ...(process.env.NODE_ENV !== 'production' && process.env.CLIENT_URL
        ? [process.env.CLIENT_URL]
        : []),
    ],
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 18080);

  // 구독 메모리를 얼마로 잡아야 하는지 판단할 근거를 남긴다 — memory-logger.ts 참고
  startMemoryLogger();
}
bootstrap();
