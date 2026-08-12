# Android(TWA) 릴리스 가이드

아기랑 안드로이드 앱은 **TWA(Trusted Web Activity)** 껍데기이고, 실제 화면은
`https://baby-rang.spectrify.kr` 의 웹앱이 그대로 렌더링된다.

즉 **웹만 배포하면 앱 내용은 즉시 반영된다.** AAB를 새로 올려야 하는 경우는 다음뿐이다.

- 앱 이름 · 아이콘 · 스플래시 · 화면 방향 변경
- `targetSdkVersion` 등 Play 정책 대응
- 시작 URL(`launchUrl`) 변경

## 릴리스 절차

```bash
pnpm version:patch            # 버전 일괄 갱신 (웹/서버/iOS/TWA)
git commit -am "chore: release v1.0.2"
git tag v1.0.2
git push && git push --tags   # → 워크플로 자동 실행
```

태그가 푸시되면 [`android-release.yml`](../.github/workflows/android-release.yml)이
AAB를 빌드해 **Play 내부 테스트 트랙**에 올린다.
이후 Play Console에서 **비공개 테스트 → 프로덕션으로 승격(promote)** 하면 출시된다.
자동 업로드는 트랙에 넣는 데까지만 하고, 출시 버튼은 항상 수동이다.

트랙을 골라 수동 실행하려면 GitHub Actions 탭에서 `Run workflow`를 쓰면 된다.

## 버전 규칙

`versionName`은 [VERSIONING.md](../VERSIONING.md)의 SemVer를 따르고,
`versionCode`는 **되돌릴 수 없는 정수**라 릴리스마다 반드시 +1 된다.
두 값은 `twa-manifest.json`과 `app/build.gradle` 양쪽에 존재하며
`pnpm version:*`이 함께 갱신한다. 어긋나면 워크플로가 빌드 전에 실패한다.

## 필요한 GitHub Secrets

저장소 → Settings → Secrets and variables → Actions 에 등록한다.

| 이름 | 값 |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | 서명 키스토어를 base64로 인코딩한 문자열 |
| `ANDROID_KEYSTORE_PASSWORD` | 키스토어 비밀번호 |
| `ANDROID_KEY_ALIAS` | 키 별칭 (현재 `my-key-alias`) |
| `ANDROID_KEY_PASSWORD` | 키 비밀번호 |
| `PLAY_SERVICE_ACCOUNT_JSON` | Play Developer API 서비스 계정 JSON 전문 |

### 키스토어 인코딩

```bash
base64 -i "<signing.keystore 경로>" | pbcopy
```

> 키스토어 원본과 비밀번호는 **저장소에 절대 커밋하지 않는다.**
> 이 파일을 잃어버리면 기존 앱을 영구히 업데이트할 수 없다.
> (Play 앱 서명에 등록돼 있다면 Google에 재발급을 요청할 수 있다.)

### Play 서비스 계정 발급

1. Google Cloud Console → 프로젝트 생성 → **서비스 계정** 생성
2. 해당 서비스 계정의 **JSON 키** 발급 → 파일 전문을 시크릿에 붙여넣기
3. Play Console → **사용자 및 권한** → 서비스 계정 이메일 초대
4. 권한 부여: *앱 액세스 권한*에서 아기랑 앱 선택 후
   **"프로덕션, 비공개 테스트, 내부 테스트 트랙에 배포"** 체크
5. 초대 직후에는 API 반영이 지연될 수 있어 첫 업로드가 실패하면 잠시 후 재시도한다

> 첫 업로드는 API로 할 수 없다. **최소 1회는 Play Console에서 AAB를 수동 업로드**해
> 앱을 생성해 둔 뒤부터 워크플로가 동작한다.

## 로컬 빌드

CI를 거치지 않고 직접 만들 때는 Bubblewrap을 쓴다. 툴체인(JDK 17 + Android SDK)은
`~/.bubblewrap` 에 이미 설치돼 있어 Android Studio는 필요 없다.

```bash
cd twa
bubblewrap build
```

> ⚠️ `bubblewrap update`는 `twa-manifest.json`을 기준으로 **`app/build.gradle`을 다시 생성**한다.
> 이때 CI 서명 설정(`signingConfigs`)과 `targetSdkVersion`이 초기화될 수 있으니
> 실행 후에는 반드시 `git diff twa/app/build.gradle`로 확인할 것.
