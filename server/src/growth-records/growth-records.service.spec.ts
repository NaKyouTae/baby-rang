import { GrowthRecordsService } from './growth-records.service';
import { rewardRecord } from '../coins/coin-rewards';

jest.mock('../coins/coin-rewards', () => ({ rewardRecord: jest.fn() }));

describe('빠른 수면 기록', () => {
  let service: GrowthRecordsService;
  let records: any[];
  let tx: any;
  const start = '2026-10-15T01:00:00.000Z';
  const end = '2026-10-15T03:00:00.000Z';
  const create = (
    type = 'SLEEP',
    startAt = start,
    quickRecord = true,
    endAt?: string,
  ) =>
    service.create('user', { childId: 'child', type, startAt, endAt }, [], {
      quickRecord,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    records = [];
    tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      growthRecord: {
        findFirst: jest.fn().mockImplementation(() => records.at(-1) ?? null),
        findUnique: jest
          .fn()
          .mockImplementation(({ where }) =>
            records.find((r) => r.id === where.id),
          ),
        create: jest.fn().mockImplementation(({ data }) => {
          const record = { id: String(records.length), ...data };
          records.push(record);
          return record;
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const record = records.find((r) => r.id === where.id);
          Object.assign(
            record,
            Object.fromEntries(
              Object.entries(data).filter(([, value]) => value !== undefined),
            ),
          );
          return record;
        }),
      },
    };
    service = new GrowthRecordsService(
      {
        growthRecord: tx.growthRecord,
        $transaction: (fn: any) => fn(tx),
      } as any,
      {} as any,
      { assertAccess: jest.fn().mockResolvedValue({}) } as any,
    );
  });

  it('두 번 누르면 하나의 수면에 시작/종료 시각을 저장하고 세 번째는 새 수면을 시작한다', async () => {
    await create();
    expect(records[0].endAt).toBeNull();
    await create('SLEEP', end);
    expect(records).toHaveLength(1);
    expect(records[0].startAt).toEqual(new Date(start));
    expect(records[0].endAt).toEqual(new Date(end));
    expect(rewardRecord).toHaveBeenCalledTimes(1);
    await create('SLEEP', '2026-10-15T05:00:00.000Z');
    expect(records).toHaveLength(2);
    expect(records[1].endAt).toBeNull();
  });

  it('기록 페이지의 수면은 연속으로 눌러도 각각 새 기록으로 저장한다', async () => {
    await create('SLEEP', start, false, start);
    await create('SLEEP', end, false, end);
    expect(records).toHaveLength(2);
    expect(tx.growthRecord.update).not.toHaveBeenCalled();
  });

  it('중간에 다른 기록이 있으면 별도 수면을 만든다', async () => {
    await create();
    await create('DIAPER', end);
    await create('SLEEP', end);
    expect(records).toHaveLength(3);
    expect(records[0].endAt).toBeNull();
  });

  it('시간을 직접 설정한 기록은 병합하지 않는다', async () => {
    await create();
    await create('SLEEP', end, false, end);
    expect(records).toHaveLength(2);
    expect(records[1].endAt).toEqual(new Date(end));
  });

  it('기존 시작/종료가 같은 빠른 수면도 종료할 수 있다', async () => {
    await create();
    records[0].endAt = new Date(start);
    await create('SLEEP', end);
    expect(records).toHaveLength(1);
    expect(records[0].endAt).toEqual(new Date(end));
  });

  it('메인 수면에 시간을 직접 설정하면 다음 메인 수면은 새 기록이 된다', async () => {
    await create();
    await service.update('user', records[0].id, {
      endAt: end,
      data: JSON.stringify({ kind: 'NAP' }),
    });
    expect(records[0].data.homeSleepPending).toBe(false);
    await create('SLEEP', '2026-10-15T05:00:00.000Z');
    expect(records).toHaveLength(2);
    expect(records[0].endAt).toEqual(new Date(end));
    expect(records[1].data.homeSleepPending).toBe(true);
  });

  it('메인 수면을 0분 그대로 저장하면 종료 대기 상태를 유지한다', async () => {
    await create();
    await service.update('user', records[0].id, {
      endAt: start,
      data: JSON.stringify({ kind: 'NAP' }),
    });
    expect(records[0].data.homeSleepPending).toBe(true);
    await create('SLEEP', end);
    expect(records).toHaveLength(1);
    expect(records[0].endAt).toEqual(new Date(end));
  });

  it('기록 페이지에서 생성한 0분 수면은 메인에서 종료하지 않는다', async () => {
    await create('SLEEP', start, false, start);
    await create('SLEEP', end);
    expect(records).toHaveLength(2);
  });

  it('이미 종료한 수면은 유지한다', async () => {
    await create('SLEEP', start, false, end);
    await create('SLEEP', '2026-10-15T05:00:00.000Z');
    expect(records).toHaveLength(2);
    expect(records[0].endAt).toEqual(new Date(end));
  });
});

describe('최근 유축량', () => {
  function serviceWith(records: unknown[]) {
    return new GrowthRecordsService(
      {
        growthRecord: { findMany: jest.fn().mockResolvedValue(records) },
        recentRecordAmount: { findMany: jest.fn().mockResolvedValue([]) },
      } as any,
      {} as any,
      { assertAccess: jest.fn().mockResolvedValue({}) } as any,
    );
  }
  it('좌우 유축량과 이전 합계 용량을 중복 없이 최근 5개까지 표시한다', async () => {
    const service = serviceWith([
      { data: { leftMl: 200, rightMl: 190 } },
      { data: { leftMl: 200, rightMl: 180 } },
      { data: { volumeMode: 'BOTH', amountMl: 70 } },
      { data: { leftMl: 0, rightMl: 'invalid', amountMl: 60 } },
      { data: { leftMl: 50 } },
    ]);
    expect(await service.recentAmounts('user', 'child', 'PUMPING')).toEqual({
      amounts: [200, 190, 180, 70, 60].map((value) => ({ value, unit: 'ml' })),
    });
  });
  it('다른 수유 유형은 기존 수유량만 조회한다', async () => {
    const service = serviceWith([{ data: { amountMl: 120, leftMl: 50 } }]);
    expect(await service.recentAmounts('user', 'child', 'FORMULA')).toEqual({
      amounts: [{ value: 120, unit: 'ml' }],
    });
  });
});

describe('최근 용량의 과거 기록 탐색', () => {
  it('최근 100건에 같은 값만 있어도 더 이전 기록에서 5개를 찾는다', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValueOnce(
        Array.from({ length: 100 }, () => ({ data: { amountMl: 120 } })),
      )
      .mockResolvedValueOnce(
        [100, 90, 80, 70].map((amountMl) => ({ data: { amountMl } })),
      );
    const service = new GrowthRecordsService(
      {
        growthRecord: { findMany },
        recentRecordAmount: { findMany: jest.fn().mockResolvedValue([]) },
      } as any,
      {} as any,
      { assertAccess: jest.fn().mockResolvedValue({}) } as any,
    );
    expect(await service.recentAmounts('user', 'child', 'FORMULA')).toEqual({
      amounts: [120, 100, 90, 80, 70].map((value) => ({ value, unit: 'ml' })),
    });
    expect(findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ skip: 100 }),
    );
  });
});

describe('같은 기록을 수정해도 최근 용량 5개 보존', () => {
  it.each(['FORMULA', 'PUMPED_FEEDING', 'PUMPING', 'BABY_FOOD'])(
    '%s 수정 이력에서 최대 5개를 반환한다',
    async (type) => {
      const dataFor = (value: number) =>
        type === 'PUMPING'
          ? { leftMl: value, rightMl: 0 }
          : type === 'BABY_FOOD'
            ? { amount: value, amountUnit: 'g' }
            : { amountMl: value };
      let record: any = {
        id: 'record',
        childId: 'child',
        type,
        data: dataFor(50),
        updatedAt: new Date(1000),
      };
      const history = new Map<string, any>();
      let clock = 1000;
      const tx: any = {
        recentRecordAmount: {
          upsert: jest.fn(({ where, create, update }) => {
            const key = JSON.stringify(where);
            history.set(
              key,
              history.has(key) ? { ...history.get(key), ...update } : create,
            );
          }),
          findMany: jest.fn(({ take }) =>
            [...history.values()]
              .sort((a, b) => b.lastUsedAt.getTime() - a.lastUsedAt.getTime())
              .slice(0, take)
              .map(({ value, unit }) => ({ value, unit })),
          ),
        },
        growthRecord: {
          findUnique: jest.fn(() => record),
          update: jest.fn(({ data }) => {
            record = {
              ...record,
              data: data.data,
              updatedAt: new Date(++clock),
            };
            return record;
          }),
          findMany: jest.fn(() => [record]),
        },
      };
      const service = new GrowthRecordsService(
        { ...tx, $transaction: (fn: any) => fn(tx) },
        {} as any,
        { assertAccess: jest.fn().mockResolvedValue({}) } as any,
      );
      for (const value of [70, 90, 110, 130, 150]) {
        await service.update('user', 'record', {
          data: JSON.stringify(dataFor(value)),
        });
      }
      expect(await service.recentAmounts('user', 'child', type)).toEqual({
        amounts: [150, 130, 110, 90, 70].map((value) => ({
          value,
          unit: 'ml',
        })),
      });
      expect(history.size).toBe(6);
    },
  );
});
