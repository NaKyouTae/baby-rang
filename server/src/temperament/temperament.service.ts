import {
  BadRequestException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AgeGroup, PaymentProductType, SubmissionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { getProductSpec } from '../payments/product-catalog';
import {
  DIMENSIONS,
  NOTICE,
  SCALE,
  getQuestionMap,
  getQuestions,
} from './data/questions';
import {
  AnswerInput,
  buildFreeContentByType,
  buildPaidContent,
  buildSummary,
  checkReliability,
  computeScores,
  determineType,
  LOCKED_SECTIONS,
  PrimaryType,
  Scores,
  Level,
} from './scoring';

const PREVIEW_TYPE_LABELS: Record<PrimaryType, string> = {
  explorer: '탐험가형',
  socializer: '사교가형',
  observer: '관찰자형',
  concentrator: '집중가형',
  balanced: '균형성장형',
};

const PREVIEW_FOCUS: Record<PrimaryType, string | null> = {
  explorer: 'activity',
  socializer: 'sociability',
  observer: 'sensitivity',
  concentrator: 'persistence',
  balanced: null,
};
import { CreateSubmissionDto, SubmitAnswersDto, UnlockResultDto } from './dto';

// 검사 결과 열람 가능 기간 — 검사 완료 시점부터 7일.
export const RESULT_ACCESS_DAYS = 7;
const RESULT_ACCESS_MS = RESULT_ACCESS_DAYS * 24 * 60 * 60 * 1000;

// completedAt 이 비어 있는 예외 케이스는 결과 생성 시각으로 대체한다.
function resultExpiresAt(completedAt: Date | null, fallback: Date) {
  return new Date((completedAt ?? fallback).getTime() + RESULT_ACCESS_MS);
}

@Injectable()
export class TemperamentService {
  constructor(private prisma: PrismaService) {}

  buildPreview(
    primaryType: PrimaryType,
    emotionModifier: boolean,
    isPaid: boolean,
  ) {
    const focus = PREVIEW_FOCUS[primaryType];
    const scores = {} as Scores;
    for (const dim of DIMENSIONS) {
      let score = 55;
      let level: Level = 'medium';
      if (dim.key === focus) {
        score = 85;
        level = 'high';
      }
      if (dim.key === 'emotional_intensity' && emotionModifier) {
        score = 80;
        level = 'high';
      }
      scores[dim.key] = {
        raw: Math.round((score / 100) * 20) + 5,
        score,
        level,
        label: dim.label,
      };
    }
    const label = PREVIEW_TYPE_LABELS[primaryType];
    const summary = buildSummary(primaryType, label, emotionModifier);
    const free = buildFreeContentByType(primaryType);
    const paidContent = buildPaidContent(scores, primaryType);
    return {
      resultId: `preview-${primaryType}`,
      isPaid,
      isReliable: true,
      reliabilityMsg: null,
      summary,
      scores,
      freeContent: free,
      lockedSections: isPaid ? [] : LOCKED_SECTIONS,
      paidContent: isPaid ? paidContent : undefined,
    };
  }

  getQuestions(ageGroup: AgeGroup) {
    const dimMap = new Map(DIMENSIONS.map((d) => [d.key, d.label]));
    return {
      questions: getQuestions(ageGroup).map((q) => ({
        id: q.id,
        questionNo: q.questionNo,
        dimension: q.dimension,
        dimensionLabel: dimMap.get(q.dimension)!,
        text: q.text,
        sortOrder: q.questionNo,
      })),
      scale: SCALE,
      notice: NOTICE,
    };
  }

  async createSubmission(userId: string, dto: CreateSubmissionDto) {
    const submission = await this.prisma.temperamentSubmission.create({
      data: {
        userId,
        ageGroup: dto.ageGroup,
        childAge: dto.childAge,
        status: SubmissionStatus.IN_PROGRESS,
      },
    });

    return { submissionId: submission.id, startedAt: submission.startedAt };
  }

  async submitAnswers(
    userId: string,
    submissionId: string,
    dto: SubmitAnswersDto,
  ) {
    const submission = await this.prisma.temperamentSubmission.findUnique({
      where: { id: submissionId },
    });
    if (!submission)
      throw new NotFoundException('제출 정보를 찾을 수 없습니다.');
    if (submission.userId !== userId) throw new ForbiddenException();

    const questionMap = getQuestionMap(submission.ageGroup);
    const expected = getQuestions(submission.ageGroup).length;
    if (dto.answers.length !== expected) {
      throw new BadRequestException(
        `응답 수가 올바르지 않습니다. (expected=${expected}, got=${dto.answers.length})`,
      );
    }

    const enriched: AnswerInput[] = [];
    for (const a of dto.answers) {
      const q = questionMap.get(a.questionId);
      if (!q) {
        throw new BadRequestException(`알 수 없는 문항: ${a.questionId}`);
      }
      if (a.score < SCALE.min || a.score > SCALE.max) {
        throw new BadRequestException(`점수 범위를 벗어났습니다: ${a.score}`);
      }
      enriched.push({
        questionId: a.questionId,
        questionNo: a.questionNo,
        dimension: q.dimension,
        score: a.score,
      });
    }

    // 채점
    const scores = computeScores(enriched);
    const typeInfo = determineType(scores);
    const reliability = checkReliability(enriched);
    const summary = buildSummary(
      typeInfo.primaryType,
      typeInfo.primaryTypeLabel,
      typeInfo.emotionModifier,
    );
    const freeContent = buildFreeContentByType(typeInfo.primaryType);
    const paidContent = buildPaidContent(scores, typeInfo.primaryType);

    // 만료 계산에 쓰려고 트랜잭션 밖에서 고정한다(아래 update 와 같은 값이어야 한다).
    const completedAt = new Date();

    // 트랜잭션: 답변 저장 + 결과 저장 + 제출 상태 갱신
    const result = await this.prisma.$transaction(async (tx) => {
      // 기존 답변 정리(재제출 케이스)
      await tx.temperamentAnswer.deleteMany({ where: { submissionId } });
      await tx.temperamentResult.deleteMany({ where: { submissionId } });

      await tx.temperamentAnswer.createMany({
        data: enriched.map((a) => ({
          submissionId,
          questionId: a.questionId,
          questionNo: a.questionNo,
          dimension: a.dimension,
          score: a.score,
        })),
      });

      const created = await tx.temperamentResult.create({
        data: {
          submissionId,
          primaryType: typeInfo.primaryType,
          primaryTypeLabel: typeInfo.primaryTypeLabel,
          emotionModifier: typeInfo.emotionModifier,
          isReliable: reliability.isReliable,
          reliabilityMsg: reliability.reliabilityMsg,
          scores: scores as any,
          summary: summary as any,
          freeContent: freeContent as any,
          paidContent: paidContent as any,
          isPaid: false,
        },
      });

      await tx.temperamentSubmission.update({
        where: { id: submissionId },
        data: {
          status: SubmissionStatus.COMPLETED,
          completedAt,
        },
      });

      return created;
    });

    return {
      submissionId,
      status: 'completed',
      resultId: result.id,
      // 결과를 함께 돌려준다. 클라이언트가 결과 페이지에서 다시 조회하지 않아도 된다.
      result: this.toResultResponse(
        result,
        resultExpiresAt(completedAt, result.createdAt),
      ),
    };
  }

  async getResult(userId: string, submissionId: string) {
    const submission = await this.prisma.temperamentSubmission.findUnique({
      where: { id: submissionId },
      include: { result: true },
    });
    if (!submission || !submission.result) {
      throw new NotFoundException('결과를 찾을 수 없습니다.');
    }
    if (submission.userId !== userId) throw new ForbiddenException();

    const r = submission.result;
    const expiresAt = resultExpiresAt(submission.completedAt, r.createdAt);
    if (Date.now() >= expiresAt.getTime()) {
      throw new GoneException(
        `결과 열람 기간(검사 후 ${RESULT_ACCESS_DAYS}일)이 지났습니다.`,
      );
    }

    return this.toResultResponse(r, expiresAt);
  }

  /**
   * 결과 응답 형태.
   *
   * 제출 직후(submitAnswers)와 조회(getResult)가 **같은 모양**을 돌려줘야 한다.
   * 제출 응답에 결과를 실어 보내면 클라이언트가 곧바로 화면을 그릴 수 있고,
   * 방금 저장한 것을 다시 읽어오는 왕복 한 번이 통째로 사라진다.
   */
  private toResultResponse(
    r: {
      id: string;
      isPaid: boolean;
      refundedAt: Date | null;
      isReliable: boolean;
      reliabilityMsg: string | null;
      summary: unknown;
      scores: unknown;
      freeContent: unknown;
      paidContent: unknown;
    },
    expiresAt: Date,
  ) {
    return {
      resultId: r.id,
      expiresAt: expiresAt.toISOString(),
      isPaid: r.isPaid,
      // 환불로 잠긴 경우. isPaid 가 이미 false 라 잠금은 위에서 처리되고,
      // 이 값은 "결제한 적 없음"과 구분해 안내 문구를 바꾸기 위한 것이다.
      isRefunded: Boolean(r.refundedAt),
      isReliable: r.isReliable,
      reliabilityMsg: r.reliabilityMsg,
      summary: r.summary,
      scores: r.scores,
      freeContent: r.freeContent,
      lockedSections: r.isPaid ? [] : LOCKED_SECTIONS,
      paidContent: r.isPaid ? r.paidContent : undefined,
    };
  }

  async unlockResult(
    userId: string,
    submissionId: string,
    dto: UnlockResultDto,
  ) {
    const submission = await this.prisma.temperamentSubmission.findUnique({
      where: { id: submissionId },
      include: { result: true },
    });
    if (!submission || !submission.result) {
      throw new NotFoundException('결과를 찾을 수 없습니다.');
    }
    if (submission.userId !== userId) throw new ForbiddenException();

    // 열람 기간이 끝난 결과는 상세 리포트 해제도 막는다(볼 수 없는 리포트 구매 방지).
    const expiresAt = resultExpiresAt(
      submission.completedAt,
      submission.result.createdAt,
    );
    if (Date.now() >= expiresAt.getTime()) {
      throw new GoneException(
        `결과 열람 기간(검사 후 ${RESULT_ACCESS_DAYS}일)이 지났습니다.`,
      );
    }

    const payment = await this.prisma.payment.findUnique({
      where: { orderId: dto.paymentId },
    });
    if (
      !payment ||
      payment.userId !== userId ||
      payment.status !== 'PAID' ||
      payment.productType !== 'TEMPERAMENT_REPORT'
    ) {
      throw new ForbiddenException('유효한 결제 내역이 없습니다.');
    }

    // 정가 미만으로 승인된 결제로는 리포트를 열 수 없다.
    // (결제 생성 단계에서 이미 막지만, 과거 데이터나 다른 경로로 만들어진
    //  Payment 가 흘러들어올 수 있으므로 사용하는 쪽에서도 확인한다.)
    const { price } = getProductSpec(PaymentProductType.TEMPERAMENT_REPORT);
    if (payment.amount < price) {
      throw new ForbiddenException(
        '결제 금액이 상품 가격과 일치하지 않습니다.',
      );
    }

    // 결제 1건은 결제할 때 지정한 검사 1건만 연다.
    // 이 확인이 없으면 ₩990 결제 1건의 orderId 로 다른 검사 결과까지
    // 무제한으로 열 수 있다. (Payment.paymentId 에 유니크 제약이 없다.)
    const meta = payment.productMeta as { submissionId?: string } | null;
    if (meta?.submissionId !== submissionId) {
      throw new ForbiddenException('이 결과에 대한 결제 내역이 아닙니다.');
    }

    const updated = await this.prisma.temperamentResult.update({
      where: { submissionId },
      data: {
        isPaid: true,
        paymentId: payment.id,
        unlockedAt: new Date(),
        // 환불 뒤 다시 구매한 경우. 지우지 않으면 화면에 "환불됨"이 남는다.
        refundedAt: null,
      },
    });

    return {
      resultId: updated.id,
      isPaid: true,
      unlockedAt: updated.unlockedAt!,
    };
  }

  async getHistory(userId: string, page: number, limit: number) {
    const where = {
      userId,
      status: SubmissionStatus.COMPLETED,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.temperamentSubmission.count({ where }),
      this.prisma.temperamentSubmission.findMany({
        where,
        include: { result: true },
        orderBy: { completedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const now = Date.now();
    return {
      items: items
        .filter((s) => s.result)
        .map((s) => {
          const expiresAt = resultExpiresAt(s.completedAt, s.result!.createdAt);
          return {
            submissionId: s.id,
            resultId: s.result!.id,
            primaryType: s.result!.primaryType,
            primaryTypeLabel: s.result!.primaryTypeLabel,
            isPaid: s.result!.isPaid,
            isRefunded: Boolean(s.result!.refundedAt),
            completedAt: s.completedAt!.toISOString(),
            expiresAt: expiresAt.toISOString(),
            isExpired: now >= expiresAt.getTime(),
          };
        }),
      total,
      page,
      limit,
    };
  }
}
