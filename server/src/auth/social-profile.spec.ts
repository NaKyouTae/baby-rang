import {
  normalizeAgeRange,
  normalizeGender,
  normalizeName,
  normalizePhone,
} from './social-profile';

// 카카오와 네이버가 같은 값을 다른 표기로 준다. 여기서 어긋나면 같은 사람이
// 제공자에 따라 다른 값으로 저장되므로, 두 쪽 표기를 모두 고정해 둔다.

describe('normalizePhone', () => {
  it('카카오의 국가번호 표기를 국내 번호로 바꾼다', () => {
    expect(normalizePhone('+82 10-1234-5678')).toBe('01012345678');
  });

  it('네이버의 하이픈 표기를 숫자만 남긴다', () => {
    expect(normalizePhone('010-1234-5678')).toBe('01012345678');
  });

  it('휴대폰 형식이 아니면 버린다', () => {
    expect(normalizePhone('02-123-4567')).toBeUndefined();
    expect(normalizePhone('')).toBeUndefined();
    expect(normalizePhone(null)).toBeUndefined();
  });
});

describe('normalizeGender', () => {
  it('카카오(male/female)와 네이버(M/F)를 같은 값으로 모은다', () => {
    expect(normalizeGender('male')).toBe('male');
    expect(normalizeGender('M')).toBe('male');
    expect(normalizeGender('female')).toBe('female');
    expect(normalizeGender('F')).toBe('female');
  });

  it("네이버의 'U'(미확인)는 값이 없는 것으로 본다", () => {
    expect(normalizeGender('U')).toBeUndefined();
  });
});

describe('normalizeAgeRange', () => {
  it('카카오(~)와 네이버(-) 표기를 10년 단위로 통일한다', () => {
    expect(normalizeAgeRange('20~29')).toBe('20-29');
    expect(normalizeAgeRange('20-29')).toBe('20-29');
  });

  it('카카오의 15~19 는 10대로 묶는다', () => {
    expect(normalizeAgeRange('15~19')).toBe('10-19');
  });

  it('80세 이상은 상한이 흐릿해 한 구간으로 둔다', () => {
    expect(normalizeAgeRange('80~89')).toBe('80-');
    expect(normalizeAgeRange('90~')).toBe('80-');
  });

  it('숫자가 없으면 버린다', () => {
    expect(normalizeAgeRange('unknown')).toBeUndefined();
  });
});

describe('normalizeName', () => {
  it('공백뿐인 이름은 없는 것으로 본다', () => {
    expect(normalizeName('  ')).toBeUndefined();
    expect(normalizeName(' 김아기 ')).toBe('김아기');
  });
});
