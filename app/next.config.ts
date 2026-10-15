import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // 안드로이드 에뮬레이터는 호스트 머신을 10.0.2.2 로 본다.
  // 이 출처를 허용하지 않으면 Next 가 dev 자산(HMR·클라이언트 청크) 요청을 차단해
  // 앱 WebView 에서 클라이언트 컴포넌트가 아예 실행되지 않는다. (개발 전용 설정)
  allowedDevOrigins: ["10.0.2.2"],
  // 예전 픽셀 화면 주소. 결제 복귀 URL·북마크로 들어와도 쿼리를 들고 홈으로 간다.
  async redirects() {
    return [{ source: "/prototype", destination: "/home", permanent: true }];
  },
  experimental: {
    authInterrupts: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

export default nextConfig;
