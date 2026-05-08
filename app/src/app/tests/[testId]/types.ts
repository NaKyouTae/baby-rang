export type TestType = 'TEMPERAMENT' | 'DEVELOPMENT' | 'UNICORN';

export type TestInfo = {
  id: string;
  type: TestType;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  linkUrl: string;
  labels: string[];
  durationMinMinutes: number | null;
  durationMaxMinutes: number | null;
  questionCount: number | null;
};
