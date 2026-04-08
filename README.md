# baby-rang (아기랑)

우리 아기의 모든 순간

## 프로젝트 구조

```
baby-rang/
├── server/          # NestJS 백엔드 (REST API)
│   ├── src/
│   │   ├── auth/    # 카카오 소셜 로그인 + JWT
│   │   ├── prisma/  # Prisma ORM 서비스
│   │   └── ...
│   └── prisma/      # Prisma 스키마
└── app/             # Next.js 웹앱 (WebView 대응)
    └── src/
        └── app/
            ├── login/       # 로그인 페이지
            ├── home/        # 홈 페이지
            ├── auth/        # 인증 콜백
            └── api/auth/    # 토큰 관리 API
```

## 기술 스택

| 구분 | 기술 |
|------|------|
| 서버 | NestJS (Node.js) |
| 앱 | Next.js (WebView) |
| DB | PostgreSQL (Supabase) |
| ORM | Prisma |
| 인증 | 카카오 소셜 로그인 |
| API | REST |

## 시작하기

### 서버

```bash
cd server
cp .env.example .env  # 환경변수 설정
pnpm install
npx prisma migrate dev
pnpm run start:dev    # http://localhost:18080
```

### 앱

```bash
cd app
pnpm install
pnpm dev               # http://localhost:3000
```

## 에셋 가이드

### 홈 배너 이미지

홈 화면 상단 배너 캐러셀에서 사용하는 이미지 규격입니다.

- **비율**: 16:7 (고정)
- **권장 사이즈**: `1200 × 525 px` (3x 레티나까지 커버)
- **최소 사이즈**: `780 × 342 px`
- **포맷**: JPG 또는 PNG (투명 배경 필요 시 PNG)
- **용량**: 300KB 이하 권장
- **세이프 에어리어**: 컨테이너 모서리가 `rounded-2xl`(16px)로 라운딩되므로, 텍스트/로고 등 핵심 요소는 가장자리에서 안쪽으로 5% 이상 여백을 두고 배치
- **렌더링**: 컴포넌트는 `object-contain`을 사용하므로 권장 비율과 다르면 위/아래 또는 좌/우에 빈 공간이 생깁니다. 잘림이 싫다면 반드시 16:7로 만드세요.
