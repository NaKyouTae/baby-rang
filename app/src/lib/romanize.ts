/**
 * 한글 → 로마자 변환 (국어의 로마자 표기법 기반, URL 슬러그용).
 *
 * 왜 필요한가:
 * 지역 페이지 URL 에 한글을 쓰면 Vercel 이 프리렌더된 페이지를 매칭하지 못해
 * 404/500 이 났다. ASCII 경로는 정상 동작하는 것이 확인되어 슬러그를 로마자로 바꾼다.
 * 검색 키워드는 제목·본문이 담당하므로 URL 이 로마자여도 색인에는 문제가 없다.
 *
 * 음운 변화(자음동화 등)까지 구현하지 않는다. 슬러그는 "고유하고 안정적이면" 충분하고,
 * 표기 정확도보다 되돌릴 수 있는 일관성이 중요하다.
 */

const CHO = [
  "g", "kk", "n", "d", "tt", "r", "m", "b", "pp",
  "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h",
];

const JUNG = [
  "a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa",
  "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i",
];

// 종성 28개 (0=받침없음 ~ 27=ㅎ). 인덱스가 어긋나면 "송파"가 "sotpa"가 되므로
// 유니코드 종성 순서를 그대로 따른다.
const JONG = [
  "",   "k",  "k",  "k",  "n",  "n",  "n",  "t",  "l",  "k",
  "m",  "p",  "l",  "l",  "p",  "l",  "m",  "p",  "p",  "t",
  "t",  "ng", "t",  "t",  "k",  "t",  "p",  "t",
];

const HANGUL_BASE = 0xac00;
const HANGUL_LAST = 0xd7a3;

/**
 * 한글 문자열을 URL 슬러그로 바꾼다.
 * 한글이 아닌 문자는 소문자 영숫자만 남기고, 나머지는 하이픈으로 접는다.
 */
export function romanize(input: string): string {
  let out = "";

  for (const ch of input) {
    const code = ch.codePointAt(0)!;

    if (code >= HANGUL_BASE && code <= HANGUL_LAST) {
      const offset = code - HANGUL_BASE;
      const cho = Math.floor(offset / 588);
      const jung = Math.floor((offset % 588) / 28);
      const jong = offset % 28;
      out += CHO[cho] + JUNG[jung] + JONG[jong];
      continue;
    }

    if (/[a-zA-Z0-9]/.test(ch)) {
      out += ch.toLowerCase();
      continue;
    }

    out += "-";
  }

  return out
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
