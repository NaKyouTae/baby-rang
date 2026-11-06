import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { corsOrigins } from '../cors-origins';
import { ChildrenService } from '../children/children.service';
import { RealtimeService, childRoom } from './realtime.service';

export const SOCKET_TICKET_TYPE = 'socket';

@WebSocketGateway({
  cors: {
    // 데코레이터는 import 시점에 평가된다. env 가 읽힌 뒤에 목록을 만들도록 함수로 넘긴다.
    origin: (
      origin: string | undefined,
      cb: (err: Error | null, allow?: boolean) => void,
    ) => cb(null, !origin || corsOrigins().includes(origin)),
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private jwt: JwtService,
    private children: ChildrenService,
    private realtime: RealtimeService,
  ) {}

  afterInit(server: Server) {
    this.realtime.attach(server);
  }

  // 로그인 토큰은 앱 도메인의 httpOnly 쿠키라 브라우저가 소켓에 실을 수 없다.
  // BFF 로 받은 짧은 티켓(/realtime/ticket)으로 연결할 때만 신원을 확인한다.
  handleConnection(socket: Socket) {
    const ticket = (socket.handshake.auth as { ticket?: unknown })?.ticket;
    try {
      if (typeof ticket !== 'string') throw new Error('no ticket');
      const payload = this.jwt.verify<{ sub?: string; type?: string }>(ticket);
      if (payload.type !== SOCKET_TICKET_TYPE || !payload.sub) {
        throw new Error('not a socket ticket');
      }
      (socket.data as { userId?: string }).userId = payload.sub;
    } catch {
      socket.disconnect(true);
    }
  }

  /**
   * 기기가 지금 보고 있는 아이들을 통째로 알려 준다. 이전에 보던 방은 모두 나간다.
   * 접근 권한이 없는 아이는 조용히 건너뛰고, 실제로 들어간 아이 id 만 돌려준다.
   */
  @SubscribeMessage('watch')
  async watch(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { childIds?: unknown },
  ) {
    const userId = (socket.data as { userId?: string }).userId;
    if (!userId) return { childIds: [] };
    const requested = Array.isArray(body?.childIds)
      ? body.childIds.filter((id): id is string => typeof id === 'string')
      : [];

    for (const room of socket.rooms) {
      if (room.startsWith('child:')) await socket.leave(room);
    }
    const joined: string[] = [];
    for (const childId of new Set(requested)) {
      try {
        await this.children.assertAccess(userId, childId);
        await socket.join(childRoom(childId));
        joined.push(childId);
      } catch {
        this.logger.debug(`watch denied user=${userId} child=${childId}`);
      }
    }
    return { childIds: joined };
  }
}
