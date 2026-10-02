-- 루트 layout 에 하드코딩돼 있던 FAQ 를 DB 로 옮긴다.
-- 전역 FAQPage 를 걷어내면서 이 내용이 사이트에서 통째로 사라지지 않도록,
-- 같은 질문들을 초기 데이터로 심어 /settings/faq 가 비어 있지 않게 한다.
-- 이후 수정·추가는 어드민에서 한다.
INSERT INTO "faqs" ("id", "category", "question", "answer", "order", "isPublished", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), '서비스 소개', '아기랑은 어떤 서비스인가요?',
   '아기랑은 0~36개월 아기를 키우는 부모를 위한 통합 육아 서비스입니다. 아기 기질 검사, 성장 기록, 원더윅스 안내, 수면추천, 주변 수유실 찾기 등 일상 육아에 필요한 도구를 한 곳에서 제공합니다.',
   1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

  (gen_random_uuid(), '서비스 소개', '아기랑은 어디서 사용할 수 있나요?',
   'iOS 는 App Store, 안드로이드는 Google Play 에서 ''아기랑'' 으로 검색해 설치할 수 있습니다. 설치 없이 https://baby-rang.spectrify.kr 에서 모바일 브라우저로 바로 사용하거나 홈 화면에 추가해 앱처럼 쓸 수도 있습니다.',
   2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

  (gen_random_uuid(), '서비스 소개', '아기랑 앱은 어디서 다운로드하나요?',
   'iOS 는 App Store (https://apps.apple.com/kr/app/id6761984903), 안드로이드는 Google Play (https://play.google.com/store/apps/details?id=kr.spectrify.baby_rang) 에서 내려받을 수 있습니다. 두 플랫폼 모두 정식 출시되었으며 설치는 무료입니다.',
   3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

  (gen_random_uuid(), '기질 검사', '아기랑의 기질 검사는 어떤 방식인가요?',
   '아기의 행동·반응 패턴에 대한 질문에 답하면 9가지 차원(활동성, 규칙성, 접근/회피, 적응성, 반응 강도, 반응 역치, 기분, 주의 산만성, 지속성)으로 분석하여 맞춤 양육 가이드를 제공합니다. Thomas & Chess 의 기질 이론을 기반으로 합니다.',
   1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

  (gen_random_uuid(), '육아 정보', '원더윅스(Wonder Weeks)란 무엇인가요?',
   '원더윅스는 아기의 정신 발달 도약기를 말합니다. 아기랑에서는 아기의 생년월일을 기반으로 도약기 시기를 자동 계산하고, 각 시기의 특징과 부모가 어떻게 대처하면 좋은지 안내합니다.',
   1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

  (gen_random_uuid(), '육아 정보', '아기 수면추천이란 무엇인가요?',
   '아기의 월령에 맞는 최적의 낮잠 횟수, 활동 시간(깨어있는 시간), 밤잠 권장 시간을 계산해 줍니다. 수면 골든타임을 지키면 아기의 건강한 수면 습관 형성에 도움이 됩니다.',
   2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

  (gen_random_uuid(), '결제/환불', '아기랑은 무료인가요?',
   '기본 기능은 무료로 사용할 수 있고, 기질 검사 전체 결과 등 일부 프리미엄 기능은 결제 또는 광고 시청을 통해 이용할 수 있습니다.',
   1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

  (gen_random_uuid(), '결제/환불', '결제한 금액을 환불받으려면 어떻게 하나요?',
   '인앱 결제는 App Store 와 Google Play 를 통해 이루어지므로 환불도 각 스토어에 신청해야 합니다. iOS 는 reportaproblem.apple.com, 안드로이드는 Play 스토어의 주문 내역에서 신청할 수 있습니다. 자세한 절차는 마이페이지의 환불 안내를 참고해 주세요.',
   2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

  (gen_random_uuid(), '계정/데이터', '아기랑에 기록한 데이터는 안전한가요?',
   '모든 데이터는 암호화되어 저장되며, 개인정보처리방침에 따라 엄격히 관리됩니다. 자세한 내용은 마이페이지의 개인정보처리방침에서 확인하실 수 있습니다.',
   1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
