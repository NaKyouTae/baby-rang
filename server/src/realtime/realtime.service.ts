import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';

export const childRoom = (childId: string) => `child:${childId}`;

/**
 * 아이를 함께 보는 기기들에 변경을 알린다.
 * REDIS_URL 이 있으면 Redis 어댑터가 다른 인스턴스의 소켓에도 전달한다(redis-io.adapter.ts).
 */
@Injectable()
export class RealtimeService {
  private server: Server | null = null;

  attach(server: Server) {
    this.server = server;
  }

  /** originSocketId — 변경을 만든 기기. 그 기기는 이미 화면에 반영했으므로 뺀다. */
  emitToChild(
    childId: string,
    event: string,
    payload: unknown,
    originSocketId?: string,
  ) {
    if (!this.server) return;
    const target = this.server.to(childRoom(childId));
    (originSocketId ? target.except(originSocketId) : target).emit(
      event,
      payload,
    );
  }
}
