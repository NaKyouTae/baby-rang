import { AgeGroup } from '@prisma/client';

export interface CreateSubmissionDto {
  ageGroup: AgeGroup;
  childAge?: number;
}

export interface SubmitAnswerItem {
  questionId: string;
  questionNo: number;
  score: number;
}

export interface SubmitAnswersDto {
  answers: SubmitAnswerItem[];
}

export interface UnlockResultDto {
  paymentId: string;
  paymentMethod?: string;
}
