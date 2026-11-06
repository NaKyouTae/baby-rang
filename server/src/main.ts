import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { startMemoryLogger } from './memory-logger';
import { corsOrigins } from './cors-origins';
import { RedisIoAdapter } from './realtime/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.enableCors({
    origin: corsOrigins(),
    credentials: true,
  });
  // 서버가 여러 대면 소켓 알림을 Redis 로 서로 전달한다 — realtime/redis-io.adapter.ts
  const ioAdapter = new RedisIoAdapter(app);
  await ioAdapter.connectToRedis(process.env.REDIS_URL);
  app.useWebSocketAdapter(ioAdapter);
  await app.listen(process.env.PORT ?? 18080);

  // 구독 메모리를 얼마로 잡아야 하는지 판단할 근거를 남긴다 — memory-logger.ts 참고
  startMemoryLogger();
}
bootstrap();
