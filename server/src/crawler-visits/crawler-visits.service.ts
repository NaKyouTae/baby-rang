import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * User-Agent 조각 → 집계에 쓸 봇 이름.
 *
 * robots.txt 에서 명시적으로 허용한 크롤러와 짝을 이룬다. 여기 없는 UA 는
 * 기록하지 않는다(사람 트래픽은 GA 가 이미 본다).
 * 소문자로 비교하므로 키도 소문자로 둔다.
 */
const BOTS: Array<[needle: string, name: string]> = [
  ['gptbot', 'GPTBot'],
  ['oai-searchbot', 'OAI-SearchBot'],
  ['chatgpt-user', 'ChatGPT-User'],
  ['claudebot', 'ClaudeBot'],
  ['claude-web', 'Claude-Web'],
  ['anthropic-ai', 'anthropic-ai'],
  ['perplexitybot', 'PerplexityBot'],
  ['perplexity-user', 'Perplexity-User'],
  ['google-extended', 'Google-Extended'],
  ['applebot-extended', 'Applebot-Extended'],
  ['applebot', 'Applebot'],
  ['bytespider', 'Bytespider'],
  ['ccbot', 'CCBot'],
  ['youbot', 'YouBot'],
  ['meta-externalagent', 'Meta-ExternalAgent'],
  ['facebookbot', 'FacebookBot'],
  ['cohere-ai', 'cohere-ai'],
];

/** 경로는 통계용이라 쿼리스트링을 떼고 길이도 제한한다. */
const MAX_PATH = 200;

@Injectable()
export class CrawlerVisitsService {
  private readonly logger = new Logger(CrawlerVisitsService.name);

  constructor(private prisma: PrismaService) {}

  /** 아는 AI 크롤러면 이름을, 아니면 null. */
  detect(userAgent: string | undefined): string | null {
    if (!userAgent) return null;
    const ua = userAgent.toLowerCase();
    // Applebot-Extended 가 Applebot 보다 먼저 와야 하므로 배열 순서를 지킨다.
    for (const [needle, name] of BOTS) {
      if (ua.includes(needle)) return name;
    }
    return null;
  }

  /**
   * 방문 1건을 일자별 카운터에 더한다.
   *
   * 실패해도 호출 측(페이지 응답)을 막지 않는다 — 통계가 응답을 깨뜨릴 이유는 없다.
   */
  async record(userAgent: string | undefined, rawPath: string) {
    const bot = this.detect(userAgent);
    if (!bot) return { recorded: false };

    const path = (rawPath.split('?')[0] || '/').slice(0, MAX_PATH);
    // 일자 단위 집계 — 시각을 00:00 으로 잘라 unique 키가 하루에 하나가 되게 한다.
    const date = new Date();
    date.setHours(0, 0, 0, 0);

    try {
      await this.prisma.crawlerVisit.upsert({
        where: { bot_path_date: { bot, path, date } },
        create: { bot, path, date },
        update: { count: { increment: 1 }, lastSeenAt: new Date() },
      });
      return { recorded: true, bot };
    } catch (error) {
      this.logger.warn(
        `크롤러 방문 기록 실패 bot=${bot} path=${path}`,
        error as Error,
      );
      return { recorded: false };
    }
  }

  /**
   * 최근 N일 요약.
   *
   * 봇별 합계와 많이 긁힌 경로를 함께 준다 — "오긴 오는가"와
   * "무엇을 읽고 가는가"가 둘 다 필요하다.
   */
  async summary(days = 30) {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (days - 1));

    const [byBot, byPath, recent] = await Promise.all([
      this.prisma.crawlerVisit.groupBy({
        by: ['bot'],
        where: { date: { gte: since } },
        _sum: { count: true },
        _max: { lastSeenAt: true },
      }),
      this.prisma.crawlerVisit.groupBy({
        by: ['path'],
        where: { date: { gte: since } },
        _sum: { count: true },
        orderBy: { _sum: { count: 'desc' } },
        take: 20,
      }),
      this.prisma.crawlerVisit.findMany({
        where: { date: { gte: since } },
        orderBy: [{ date: 'desc' }, { count: 'desc' }],
        take: 100,
      }),
    ]);

    return {
      days,
      since,
      bots: byBot
        .map((b) => ({
          bot: b.bot,
          total: b._sum.count ?? 0,
          lastSeenAt: b._max.lastSeenAt,
        }))
        .sort((a, b) => b.total - a.total),
      paths: byPath.map((p) => ({ path: p.path, total: p._sum.count ?? 0 })),
      recent,
    };
  }
}
