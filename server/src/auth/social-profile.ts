// 카카오·네이버가 내려주는 회원 정보를 우리 저장 형식으로 맞춘다.
//
// 두 제공자가 같은 값을 다른 표기로 준다(전화번호 +82, 성별 M/F, 연령대 ~ vs -).
// 그대로 저장하면 조회·통계에서 provider 분기가 계속 따라붙으므로 입구에서 통일한다.

/** 전화번호 → 01012345678 (숫자만, 국내 0 접두). 알아볼 수 없으면 undefined. */
export function normalizePhone(raw?: string | null): string | undefined {
  if (!raw) return undefined;

  let digits = raw.replace(/\D/g, '');
  // 카카오는 '+82 10-1234-5678' 처럼 국가번호를 붙여 준다.
  if (digits.startsWith('82')) {
    digits = `0${digits.slice(2)}`;
  }
  // 국내 휴대폰은 10~11자리(010/011/016/017/018/019).
  if (!/^01\d{8,9}$/.test(digits)) return undefined;
  return digits;
}

/** 성별 → 'male' | 'female'. 카카오는 male/female, 네이버는 M/F/U. */
export function normalizeGender(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const value = raw.trim().toLowerCase();
  if (value === 'male' || value === 'm') return 'male';
  if (value === 'female' || value === 'f') return 'female';
  // 네이버의 'U'(미확인)는 값이 없는 것과 같다.
  return undefined;
}

/**
 * 연령대 → '20-29' 같은 10년 단위 구간.
 *
 * 카카오는 '20~29'·'15~19'(10대 후반만 따로), 네이버는 '20-29'·'60-' 로 준다.
 * 시작 나이의 10년 단위로 묶어 한 가지 표기로 만든다('15~19' → '10-19').
 * 80세 이상은 두 제공자 모두 상한이 흐릿해 '80-' 하나로 둔다.
 */
export function normalizeAgeRange(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const match = raw.match(/\d+/);
  if (!match) return undefined;

  const start = Number(match[0]);
  if (!Number.isFinite(start) || start < 0) return undefined;
  if (start >= 80) return '80-';

  const decade = Math.floor(start / 10) * 10;
  return `${decade}-${decade + 9}`;
}

/** 공백뿐인 이름은 없는 것으로 본다. */
export function normalizeName(raw?: string | null): string | undefined {
  const name = raw?.trim();
  return name ? name : undefined;
}
