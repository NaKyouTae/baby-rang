import type { ConsentInput } from './auth.service';

// 소셜 동의 화면에 등록한 약관 태그를 우리 동의 항목으로 나눈다.
//
// 태그는 카카오(간편가입)·네이버(약관 동의) 개발자 콘솔에 등록한 값이고,
// 우리가 정한 규칙은 `{키워드}_{시행일}` 이다(예: service_20260408).
// 시행일이 바뀌어도 키워드는 그대로이므로 접두사로 분류한다.
// 두 콘솔에 같은 태그를 쓰므로 분류도 한 곳에서 한다.

const TAG_PREFIXES: Array<[string, keyof ConsentInput]> = [
  ['service', 'terms'],
  ['privacy', 'privacy'],
  ['marketing', 'marketing'],
  ['third_party', 'thirdParty'],
];

/** 태그에 맞는 동의 항목. 모르는 태그면 null. */
export function consentKeyOfTag(tag: string): keyof ConsentInput | null {
  const lower = tag.toLowerCase();
  return TAG_PREFIXES.find(([prefix]) => lower.startsWith(prefix))?.[1] ?? null;
}
