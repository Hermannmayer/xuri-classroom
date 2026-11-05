import JSEncrypt from 'jsencrypt';

/**
 * 后端 UserApi#login 用 RSA 私钥解密密码（Cipher "RSA" = PKCS#1 v1.5）。
 * 公钥每次后端启动随机生成，必须先 GET /api/system 取 publicKey。
 */
export function encryptPassword(plain: string, publicKey: string): string {
  const enc = new JSEncrypt();
  enc.setPublicKey(publicKey);
  const encrypted = enc.encrypt(plain);
  if (!encrypted) throw new Error('密码加密失败，请刷新页面重试');
  return encrypted;
}
