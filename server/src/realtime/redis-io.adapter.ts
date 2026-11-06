import { INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import type { Server, ServerOptions } from 'socket.io';

/**
 * 서버를 여러 대로 늘려도 아이 방(child:{id}) 알림이 모든 인스턴스의 소켓에 닿게 한다.
 * 한 인스턴스가 보낸 emit 을 Redis pub/sub 으로 다른 인스턴스에 전달한다.
 *
 * REDIS_URL 이 없으면 socket.io 기본 메모리 어댑터로 동작한다(한 대일 때·로컬 개발).
 * long-polling 은 요청마다 같은 인스턴스로 가야 해서(sticky session) 여러 대에서 깨진다.
 * 그래서 클라이언트는 websocket 전송만 쓴다(app/src/lib/realtime.ts).
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly redisLogger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;

  constructor(app: INestApplicationContext) {
    super(app);
  }

  async connectToRedis(url: string | undefined): Promise<void> {
    if (!url) {
      this.redisLogger.log('REDIS_URL 없음 — 메모리 어댑터로 동작');
      return;
    }
    const pubClient = createClient({ url });
    const subClient = pubClient.duplicate();
    // 연결이 끊기면 redis 클라이언트가 스스로 다시 붙는다. 그동안의 알림은 유실되고,
    // 받는 기기는 다음에 화면으로 돌아올 때 다시 받아 맞춘다.
    for (const client of [pubClient, subClient]) {
      client.on('error', (err: Error) =>
        this.redisLogger.warn(`redis error: ${err.message}`),
      );
    }
    await Promise.all([pubClient.connect(), subClient.connect()]);
    this.adapterConstructor = createAdapter(pubClient, subClient);
    this.redisLogger.log('Redis 어댑터 연결됨');
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options) as Server;
    if (this.adapterConstructor) server.adapter(this.adapterConstructor);
    return server;
  }
}
