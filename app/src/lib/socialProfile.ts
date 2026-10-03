// 소셜(카카오/네이버)에서 받아 저장한 값을 화면에 보여줄 때 쓰는 표기 변환.
// 저장 형식은 서버에서 한 가지로 통일해 두었다(server/src/auth/social-profile.ts).

/** 01012345678 → 010-1234-5678. 알 수 없는 형식이면 그대로 돌려준다. */
export function formatPhone(phone?: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export function genderLabel(gender?: string | null): string {
  if (gender === 'male') return '남성';
  if (gender === 'female') return '여성';
  return '';
}

/** '20-29' → '20대', '80-' → '80대 이상'. */
export function ageRangeLabel(ageRange?: string | null): string {
  if (!ageRange) return '';
  const start = ageRange.split('-')[0];
  if (!start) return '';
  return ageRange.endsWith('-') ? `${start}대 이상` : `${start}대`;
}

/** 선택 동의항목이라 비어 있을 수 있다. 빈 값은 "미제공"으로 보여준다. */
export function optionalValue(label: string): string {
  return label || '미제공';
}
