import { GrowthQuickButtonsService } from './growth-quick-buttons.service';

const expected = [
  'FORMULA',
  'BREASTFEEDING',
  'PUMPED_FEEDING',
  'PUMPING',
  'BABY_FOOD',
  'SLEEP',
  'DIAPER',
];

describe('기록 메뉴 구성', () => {
  let service: GrowthQuickButtonsService;
  let findMany: jest.Mock;
  beforeEach(() => {
    findMany = jest.fn().mockResolvedValue([]);
    service = new GrowthQuickButtonsService({
      growthQuickButton: { findMany },
    } as any);
  });

  it('처음에는 지정된 7개 항목을 순서대로 모두 표시한다', async () => {
    expect(await service.findAll('user')).toEqual(expected);
  });

  it('과거 기본 4개 구성도 새 기본 구성으로 전환한다', async () => {
    findMany.mockResolvedValue(
      ['FORMULA', 'SLEEP', 'DIAPER', 'BABY_FOOD'].map((type) => ({ type })),
    );
    expect(await service.findAll('user')).toEqual(expected);
  });

  it('저장된 사용자 설정에서 제거된 메뉴만 제외한다', async () => {
    findMany.mockResolvedValue(
      ['SLEEP', 'BATH', 'MEDICATION', 'DIAPER'].map((type) => ({ type })),
    );
    expect(await service.findAll('user')).toEqual(['SLEEP', 'DIAPER']);
  });

  it('제거된 항목은 새로 저장할 수 없다', async () => {
    await expect(service.replaceAll('user', ['BATH'])).rejects.toThrow(
      'invalid type',
    );
  });
});
