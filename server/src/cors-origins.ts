/** HTTP(main.ts)와 소켓(realtime.gateway.ts)이 같은 오리진을 허용하도록 한곳에서 정한다. */
export function corsOrigins(): string[] {
  return [
    'https://babyroom.spectrify.kr',
    'https://babyroom-admin.spectrify.kr',
    // 예전 도메인. 스토어에 나간 앱들은 WebView 시작 주소가 각 빌드에 박혀 있어
    // 업데이트하지 않는 한 영원히 이쪽으로 들어온다. 그 호스트를 리다이렉트가 아니라
    // 같은 앱을 띄우는 별칭으로 두면 오리진도 예전 도메인이 되므로 함께 허용한다.
    'https://baby-rang.spectrify.kr',
    'https://baby-rang-admin.spectrify.kr',
    'http://localhost:13000',
    'http://localhost:13001',
    ...(process.env.NODE_ENV !== 'production' && process.env.CLIENT_URL
      ? [process.env.CLIENT_URL]
      : []),
  ];
}
