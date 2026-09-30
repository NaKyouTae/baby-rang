/**
 * 검사 결과를 기다리는 동안 보여주는 로딩 화면.
 *
 * 답안 제출(test 페이지)과 결과 조회(result 페이지)가 **같은 화면**을 써야 한다.
 * 제출부터 결과가 그려지기까지 네트워크 왕복이 두 번 있는데(답안 제출,
 * 결과 페이지 RSC 페이로드), 두 구간이 다른 UI 를 쓰면 사용자에게는
 * 로딩이 두 번 깜빡이는 것으로 보인다. 한 컴포넌트를 공유해 하나로 이어 붙인다.
 */
export default function ResultLoading({
  message = '아기의 기질을 분석하고 있어요',
}: {
  message?: string;
}) {
  return (
    <main className="flex flex-col items-center justify-center min-h-dvh gap-4 gradient-page">
      <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-500 rounded-full animate-spin" />
      <p className="text-sm text-gray-500">{message}</p>
      <p className="text-xs text-gray-300">잠시만 기다려 주세요.</p>
    </main>
  );
}
