#!/usr/bin/env bash
#
# 아카이브에 실제로 박힌 값이 프로젝트 설정과 같은지 확인한다.
#
# 사용법: ./scripts/verify-ios-archive.sh            ← 가장 최근 아카이브 검사
#         ./scripts/verify-ios-archive.sh <경로>     ← 특정 .xcarchive 검사
#
# ⚠️ 기대값을 project.pbxproj 에서 직접 grep 하면 안 된다.
#    pbxproj 는 `buildSettings = { ... }; name = Release;` 순서라 name 이 뒤에 온다.
#    "먼저 나오는 블록이 Release" 같은 가정으로 읽으면 Debug/Release 가 뒤바뀌어
#    보인다(실제로 그 착각으로 운영 빌드에 개발용 카카오 키가 들어간 적이 있다).
#    그래서 Xcode 가 해석한 값을 xcodebuild 로 물어본다.

set -u
cd "$(dirname "$0")/../ios/BabyRang" || exit 1

# xcode-select 가 CommandLineTools 를 가리키면 xcodebuild 가 동작하지 않는다.
# sudo 없이 넘어갈 수 있도록 Xcode.app 을 직접 가리킨다.
if ! xcodebuild -version >/dev/null 2>&1; then
  export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
fi

settings=$(xcodebuild -showBuildSettings -scheme BabyRang -configuration Release 2>/dev/null)
if [ -z "$settings" ]; then
  echo "❌ 빌드 설정을 읽지 못했습니다. Xcode 가 설치돼 있는지 확인하세요."
  exit 1
fi
pick() { echo "$settings" | grep -E "^ *$1 = " | head -1 | sed 's/.*= *//'; }

expected_key=$(pick KAKAO_NATIVE_APP_KEY)
expected_build=$(pick CURRENT_PROJECT_VERSION)
expected_version=$(pick MARKETING_VERSION)

archive="${1:-$(ls -td "$HOME"/Library/Developer/Xcode/Archives/*/BabyRang*.xcarchive 2>/dev/null | head -1)}"
if [ -z "$archive" ] || [ ! -d "$archive" ]; then
  echo "❌ 아카이브를 찾지 못했습니다."
  exit 1
fi

plist="$archive/Products/Applications/BabyRang.app/Info.plist"
if [ ! -f "$plist" ]; then
  echo "❌ Info.plist 가 없습니다: $plist"
  exit 1
fi

actual_key=$(/usr/libexec/PlistBuddy -c "Print :KakaoNativeAppKey" "$plist" 2>/dev/null)
actual_build=$(/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" "$plist" 2>/dev/null)
actual_version=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "$plist" 2>/dev/null)
actual_scheme=$(plutil -extract CFBundleURLTypes xml1 -o - "$plist" 2>/dev/null | grep -oE 'kakao[a-f0-9]{32}' | head -1)

echo "아카이브: $(basename "$archive")"
echo "기대값  : Release 구성 (xcodebuild 해석)"
echo

fail=0
check() { # 이름 기대값 실제값
  if [ "$2" = "$3" ]; then
    printf '  ✅ %-12s %s\n' "$1" "$3"
  else
    printf '  ❌ %-12s 기대 %s / 실제 %s\n' "$1" "$2" "$3"
    fail=1
  fi
}

check "버전" "$expected_version" "$actual_version"
check "빌드 번호" "$expected_build" "$actual_build"
check "카카오 키" "$expected_key" "$actual_key"
check "카카오 스킴" "kakao$expected_key" "$actual_scheme"

echo
if [ "$fail" -eq 0 ]; then
  echo "✅ 프로젝트 설정과 일치합니다. 제출해도 됩니다."
else
  echo "❌ 불일치. 아카이브를 다시 만드세요."
  exit 1
fi
