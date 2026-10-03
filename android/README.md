# 아기랑 Android 네이티브 앱

WebView 로 `https://baby-rang.spectrify.kr/home` 을 띄우고, 웹이 할 수 없는 일
(카카오톡·네이버 앱 로그인 · Play 결제 · AdMob 배너 · 위치 권한)만 네이티브가 맡는다.
iOS 앱(`ios/`)과 같은 구조이고, 웹 쪽 짝은 `app/src/lib/*Bridge*`·`app/src/lib/kakaoNativeLogin.ts` 다.

> TWA(`twa/`)는 이 앱으로 대체됐다. 같은 패키지(`kr.spectrify.baby_rang`)라 같은 Play
> 리스팅을 덮어쓴다. **Play 에 아직 TWA 가 올라가 있으면 네이티브 기능이 하나도 동작하지
> 않는다** — TWA 는 Chrome 이 그대로 렌더하므로 브릿지가 주입되지 않는다.

## 카카오 로그인

카카오톡이 깔려 있으면 카카오톡 앱으로 인증하고, 없으면 카카오 SDK 의 카카오계정
로그인으로 넘어간다. 어느 쪽이든 끝나면 `kakao{앱키}://oauth` 로 **앱에 돌아온다**.

앱에서는 우리 웹 OAuth(`/auth/kakao`)를 쓰지 않는다. 그 경로는 로그인이 끝나면 웹 홈으로
리다이렉트해 버려서, 사용자가 앱 밖(또는 WebView 안의 웹 세션)에 남는다.
웹 카카오 로그인은 브라우저로 접속했을 때만 쓴다(`LoginPromptProvider` 참고).

### 카카오 개발자 콘솔 등록 (필수)

[카카오 개발자 콘솔](https://developers.kakao.com) > 내 애플리케이션 > **플랫폼 > Android**
에 **패키지명과 키 해시**를 등록해야 한다. 하나라도 어긋나면 카카오톡이 인증을 거부하고,
SDK 는 조용히 카카오계정 로그인으로 빠진다(그쪽도 같은 이유로 실패한다).

등록할 패키지명:

| 빌드 | 패키지명 | 카카오 앱 |
| --- | --- | --- |
| Debug | `kr.spectrify.baby_rang.debug` | 개발 앱 (`6e65…`) |
| Release | `kr.spectrify.baby_rang` | 운영 앱 (`3cab…`) |

> ⚠️ 패키지명은 `baby_rang`(언더스코어)이다. Kotlin 패키지 `kr.spectrify.babyrang` 과 다르다.

등록할 키 해시(Base64, SHA-1):

| 서명 키 | 키 해시 | 쓰이는 곳 |
| --- | --- | --- |
| 로컬 debug | `+5eLF7wX8x5Nf3kRf5UBFa7taZs=` | `./gradlew installDebug` |
| 업로드 키 | `RXPXItlHxmNbgQxC7txCTX1e9t8=` | CI 가 만든 AAB/APK 를 직접 설치할 때 |
| Play 앱 서명 키 | **Play Console 에서 확인** | **스토어에서 받은 앱 (실사용자 전부)** |

**Play 앱 서명 키를 빠뜨리기 쉽다.** 업로드한 AAB 는 Google 이 자기 키로 다시 서명해서
배포하므로, 사용자 기기의 키 해시는 업로드 키와 다르다.
Play Console > 테스트 및 출시 > **앱 완전성 > 앱 서명 키 인증서**의 SHA-1 을 Base64 로 바꿔 등록한다:

```bash
# Play Console 에서 복사한 SHA-1 (콜론 포함) 을 그대로 넣는다
echo "AA:BB:...:FF" | tr -d ':\n' | xxd -r -p | openssl base64
```

## 네이버 로그인

네이버앱이 깔려 있으면 네이버앱으로, 없으면 SDK 가 띄우는 인앱 웹뷰로 인증한다.
카카오와 같은 이유로 우리 웹 OAuth(`/auth/naver`)는 브라우저에서만 쓴다.

웹 쪽 짝은 `app/src/lib/naverNativeLogin.ts`, 네이티브는 `NaverLoginManager.kt` 다.

### 네이버 개발자센터 등록 (필수)

[네이버 개발자센터](https://developers.naver.com) > 내 애플리케이션 > **Android** 에
**패키지명**(`kr.spectrify.baby_rang`, debug 는 `.debug`)과 **다운로드 URL**을 등록한다.
같은 화면의 **제공 정보 선택**에서 동의항목을 정한다:

| 항목 | 설정 |
| --- | --- |
| 회원이름 | 필수 |
| 연락처 전화번호 | 필수 |
| 성별 | 추가(선택) |
| 연령대 | 추가(선택) |

> ⚠️ 전화번호·이름은 네이버 검수를 통과해야 실제로 내려온다. 승인 전에는 값이 비어
> 서버가 가입을 거부한다(`SOCIAL_CONSENT_REQUIRED`).

### 키 설정

Client ID·Secret 은 `app/build.gradle` 의 `buildConfigField` 로 주입한다
(`NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`). **기본값은 비어 있다** — 채우기 전에는
초기화를 건너뛰고 네이버 로그인만 실패한다(다른 기능은 그대로 동작).

서버에도 같은 값이 필요하다(`NAVER_CLIENT_ID`/`NAVER_CLIENT_SECRET`).
네이버는 토큰의 출처를 되묻는 API 가 없어서, 서버가 이 키로 refresh 가 되는지를 보고
"우리 앱이 발급한 토큰"인지 판정하기 때문이다.

### 기기에서 진단하기

앱이 시작할 때 실제 패키지명·키 해시·카카오톡 로그인 가능 여부를 로그로 남긴다.

```bash
adb logcat -s BabyRangAuth KakaoLoginManager NaverLoginManager BabyRangWeb
```

- 로그가 아예 안 나오면 → 설치된 앱이 네이티브 앱이 아니다(TWA 이거나 구버전).
- `카카오톡로그인가능=false` 인데 카카오톡이 깔려 있으면 → 매니페스트의 `<queries>` 누락.
- `카카오톡 로그인 실패` 가 찍히면 → 거의 위 콘솔 등록값 불일치. 에러 본문을 볼 것.
