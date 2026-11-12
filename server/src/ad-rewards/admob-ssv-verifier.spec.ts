import { generateKeyPairSync, sign } from 'crypto';
import { AdmobSsvVerifier } from './admob-ssv-verifier';

/** AdMob 이 보내는 모양 그대로 서명된 쿼리를 만든다. */
function signedQuery(privateKey: Parameters<typeof sign>[2], body: string) {
  const signature = sign('sha256', Buffer.from(body), privateKey).toString(
    'base64url',
  );
  return `${body}&signature=${signature}&key_id=42`;
}

describe('AdmobSsvVerifier', () => {
  const { privateKey, publicKey } = generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
  });
  const body =
    'ad_network=5450213213286189855&ad_unit=1670148112&custom_data=abc&reward_amount=1&reward_item=%EB%B3%B4%EC%84%9D&timestamp=1700000000000&transaction_id=tx1&user_id=u1';

  let verifier: AdmobSsvVerifier;
  beforeEach(() => {
    verifier = new AdmobSsvVerifier();
    verifier.setKeysForTest({ '42': publicKey });
  });

  it('맞는 서명을 통과시킨다', async () => {
    await expect(verifier.verify(signedQuery(privateKey, body))).resolves.toBe(
      true,
    );
  });

  it('서명 뒤 쿼리가 바뀌면 거부한다', async () => {
    const q = signedQuery(privateKey, body).replace(
      'custom_data=abc',
      'custom_data=xyz',
    );
    await expect(verifier.verify(q)).resolves.toBe(false);
  });

  it('서명이 없으면 거부한다', async () => {
    await expect(verifier.verify(body)).resolves.toBe(false);
  });
});
