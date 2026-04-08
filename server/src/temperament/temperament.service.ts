import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AgeGroup, SubmissionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
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
import {
  CreateSubmissionDto,
  SubmitAnswersDto,
  UnlockResultDto,
} from './dto';

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
    if (!submission) throw new NotFoundException('제출 정보를 찾을 수 없습니다.');
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
          completedAt: new Date(),
        },
      });

      return created;
    });

    return {
      submissionId,
      status: 'completed',
      resultId: result.id,
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
    return {
      resultId: r.id,
      isPaid: r.isPaid,
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

    const updated = await this.prisma.temperamentResult.update({
      where: { submissionId },
      data: {
        isPaid: true,
        paymentId: payment.id,
        unlockedAt: new Date(),
      },
    });

    return {
      resultId: updated.id,
      isPaid: true,
      unlockedAt: updated.unlockedAt!,
    };
  }

  async getHistory(
    userId: string,
    page: number,
    limit: number,
  ) {
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

    return {
      items: items
        .filter((s) => s.result)
        .map((s) => ({
          submissionId: s.id,
          resultId: s.result!.id,
          primaryType: s.result!.primaryType,
          primaryTypeLabel: s.result!.primaryTypeLabel,
          isPaid: s.result!.isPaid,
          completedAt: s.completedAt!.toISOString(),
        })),
      total,
      page,
      limit,
    };
  }
}
