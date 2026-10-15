/**
 * 아기랑 공통 로딩 표시 — 작은 회전 아이콘 하나.
 *
 * "불러오는 중", "저장 중..." 같은 글자 대신 이걸 쓴다. 문구를 화면마다 다르게 쓰면
 * 말투가 갈리고, 말줄임표(...)가 붙어 어수선해진다.
 * 색은 currentColor 라 감싼 요소의 글자색을 따른다(버튼 안에서는 버튼 글자색).
 * 화면 낭독기에는 label 을 읽어 준다.
 */
export default function Loading({
  size = 20,
  label = '불러오는 중',
  className = '',
}: {
  size?: number;
  label?: string;
  className?: string;
}) {
  return (
    <span role="status" aria-label={label} className={`inline-flex shrink-0 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        className="block animate-spin"
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </span>
  );
}

/** 영역 가운데에 띄우는 로딩 — 목록·시트처럼 내용이 들어올 자리가 비어 있을 때. */
export function LoadingBlock({
  size = 20,
  label,
  className = 'py-10',
}: {
  size?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div className={`w-full flex items-center justify-center text-[#808991] ${className}`}>
      <Loading size={size} label={label} />
    </div>
  );
}
