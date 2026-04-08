"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:18080";

export default function LoginPage() {
  const handleKakaoLogin = () => {
    window.location.href = `${API_URL}/auth/kakao`;
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center min-h-screen bg-white">
      <h1 className="text-4xl font-bold text-gray-900 mb-12">아기랑</h1>
      <button
        onClick={handleKakaoLogin}
        className="flex items-center justify-center w-72 h-12 rounded-lg text-sm font-medium"
        style={{ backgroundColor: "#FEE500", color: "#191919" }}
      >
        카카오로 시작하기
      </button>
    </div>
  );
}
