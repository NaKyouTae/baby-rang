/*
 * Copyright 2020 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package kr.spectrify.baby_rang;

import android.content.pm.ActivityInfo;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;

import com.google.androidbrowserhelper.trusted.TwaLauncher;

public class LauncherActivity
        extends com.google.androidbrowserhelper.trusted.LauncherActivity {

    private static final String TAG = "BabyRangLauncher";
    private static final String CHROME_PACKAGE = "com.android.chrome";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Setting an orientation crashes the app due to the transparent background on Android 8.0
        // Oreo and below. We only set the orientation on Oreo and above. This only affects the
        // splash screen and Chrome will still respect the orientation.
        // See https://github.com/GoogleChromeLabs/bubblewrap/issues/496 for details.
        if (Build.VERSION.SDK_INT > Build.VERSION_CODES.O) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_USER_PORTRAIT);
        } else {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        }
    }

    /**
     * TWA를 렌더링할 브라우저를 Chrome으로 고정한다.
     *
     * 기본 동작은 기기의 "기본 브라우저"를 쓰는데, 삼성 인터넷이 기본이면 결제가 깨진다.
     * 삼성 인터넷은 Digital Goods API를 부분적으로만 구현해서 상품 조회는 되지만
     * PaymentRequest.show() 가 "AbortError: Invalid state" 로 즉시 끊긴다.
     * (동일 증상 보고: pwa-builder/pwabuilder#6151)
     *
     * Chrome이 없거나 사용 중지된 기기에서는 기본 동작으로 되돌린다. 그런 기기에서는
     * 웹 쪽(playBilling.ts)이 삼성 인터넷을 감지해 결제 UI를 숨기므로,
     * "눌러도 아무 일이 없는" 상태로 빠지지는 않는다.
     */
    @Override
    protected TwaLauncher createTwaLauncher() {
        if (isPackageUsable(CHROME_PACKAGE)) {
            Log.i(TAG, "TWA provider: " + CHROME_PACKAGE);
            return new TwaLauncher(this, CHROME_PACKAGE);
        }
        Log.i(TAG, "Chrome unavailable, falling back to default browser");
        return super.createTwaLauncher();
    }

    /** 설치돼 있고 사용 중지되지 않았는지. 삼성 기기는 Chrome이 꺼져 있는 경우가 있다. */
    private boolean isPackageUsable(String packageName) {
        try {
            ApplicationInfo info = getPackageManager().getApplicationInfo(packageName, 0);
            return info.enabled;
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        }
    }

    @Override
    protected Uri getLaunchingUrl() {
        // Get the original launch Url.
        Uri uri = super.getLaunchingUrl();

        return uri;
    }
}
