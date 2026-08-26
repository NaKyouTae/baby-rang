package kr.spectrify.baby_rang;

import com.google.androidbrowserhelper.playbilling.digitalgoods.DigitalGoodsRequestHandler;

public class DelegationService extends
        com.google.androidbrowserhelper.trusted.DelegationService {
    @Override
    public void onCreate() {
        super.onCreate();

        // 웹(Digital Goods API)에서 오는 상품 조회·구매 요청을 Play 결제로 넘긴다.
        // 이 핸들러가 없으면 브라우저에서 getDigitalGoodsService() 가 실패한다.
        registerExtraCommandHandler(new DigitalGoodsRequestHandler(getApplicationContext()));
    }
}

