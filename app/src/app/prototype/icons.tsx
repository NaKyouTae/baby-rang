/**
 * Figma 디자인에서 받은 이모지 아이콘.
 *
 * 몇 개는 한 이모지가 레이어 여러 장으로 쪼개져 나왔다(분유수유·기록·원더윅스).
 * 디자인의 inset 비율을 그대로 써서 겹쳐야 원본과 같은 모양이 된다.
 */

const BASE = '/prototype/icons';

type IconProps = { size?: number; className?: string };

/** 레이어 한 장짜리 아이콘. */
function Single({ file, size = 32, className }: IconProps & { file: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${BASE}/${file}`}
      alt=""
      width={size}
      height={size}
      className={`block shrink-0 ${className ?? ''}`.trim()}
      style={{ width: size, height: size }}
    />
  );
}

/** 레이어 여러 장을 디자인의 inset 대로 겹친 아이콘. */
function Layered({
  size = 32,
  layers,
}: IconProps & { layers: { file: string; inset: string }[] }) {
  return (
    <span className="relative block shrink-0" style={{ width: size, height: size }}>
      {layers.map((l) => (
        // inset 은 래퍼가 갖는다. img 에 직접 주면 size-full 과 더해져 밖으로 삐져나간다.
        <span key={l.file} className="absolute block" style={{ inset: l.inset }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${BASE}/${l.file}`} alt="" className="absolute inset-0 block max-w-none size-full" />
        </span>
      ))}
    </span>
  );
}

export const DecorateIcon = (p: IconProps) => (
  <Layered {...p} layers={[{ file: 'decorate.svg', inset: '9.37% 1.25%' }]} />
);
export const GemIcon = (p: IconProps) => (
  <Layered {...p} layers={[{ file: 'gem.svg', inset: '11.52% 3.75%' }]} />
);

/* 좌측 — 수유 계열 */
export const FormulaIcon = (p: IconProps) => (
  <span className="relative block shrink-0" style={{ width: p.size ?? 32, height: p.size ?? 32 }}>
    {/* eslint-disable @next/next/no-img-element */}
    <img src={`${BASE}/act-formula-base.svg`} alt="" className="absolute inset-0 block max-w-none size-full" />
    {[
      { file: 'act-formula-a.svg', inset: '51.45% 10.18% 3.86% 8.28%' },
      { file: 'act-formula-b.svg', inset: '7.44% 17.2% 42.08% 34.1%' },
      { file: 'act-formula-c.svg', inset: '52.52% 14.42% 4.77% 22.99%' },
    ].map((l) => (
      <span key={l.file} className="absolute block" style={{ inset: l.inset }}>
        <img src={`${BASE}/${l.file}`} alt="" className="absolute inset-0 block max-w-none size-full" />
      </span>
    ))}
    {/* eslint-enable @next/next/no-img-element */}
  </span>
);
export const BreastIcon = (p: IconProps) => <Single {...p} file="act-breast.svg" />;
export const PumpedIcon = (p: IconProps) => <Single {...p} file="act-pumped.svg" />;
export const PumpingIcon = (p: IconProps) => <Single {...p} file="act-pumping.svg" />;

/* 우측 */
export const BabyFoodIcon = (p: IconProps) => <Single {...p} file="act-babyfood.svg" />;
export const SleepIcon = (p: IconProps) => <Single {...p} file="act-sleep.svg" />;
export const DiaperIcon = (p: IconProps) => <Single {...p} file="act-diaper.svg" />;
export const SettingsIcon = (p: IconProps) => (
  <Layered {...p} layers={[{ file: 'act-settings.svg', inset: '6.68% 9.12%' }]} />
);

/* 하단 탭 */
export const TabRoomIcon = (p: IconProps) => <Single {...p} file="tab-room.svg" />;
export const TabRecordIcon = (p: IconProps) => (
  <Layered
    {...p}
    layers={[
      { file: 'tab-record-a.svg', inset: '10.81% 15.68%' },
      { file: 'tab-record-b.svg', inset: '40.24% 15.68% 23.72% 15.68%' },
    ]}
  />
);
export const TabPatternIcon = (p: IconProps) => (
  <Layered {...p} layers={[{ file: 'tab-pattern.svg', inset: '12.5%' }]} />
);
export const TabGrowthIcon = (p: IconProps) => <Single {...p} file="tab-growth.svg" />;
export const TabWeeksIcon = (p: IconProps) => (
  <Layered
    {...p}
    layers={[
      { file: 'tab-weeks-a.svg', inset: '12% 10% 10.43% 10%' },
      { file: 'tab-weeks-b.svg', inset: '12% 10% 69.02% 10%' },
      { file: 'tab-weeks-c.svg', inset: '5.94% 22.73% 81.94% 22.73%' },
    ]}
  />
);
