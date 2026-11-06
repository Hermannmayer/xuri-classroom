package cn.surveyking.server.core.uitls;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * 题库内容的字段级加密（AES-256-GCM）。
 *
 * <p>目的：数据库被整库拖走时，题目、选项、答案解析在库里只是密文——
 * 这是防「别的机构直接拿一份 mysqldump 就把题库搬走」唯一真正有效的一招，
 * 前端禁复制、限流那些都只是提高门槛。
 *
 * <p>密钥来源（按优先级）：
 * <ol>
 *   <li>环境变量 {@code SK_CRYPTO_KEY}</li>
 *   <li>JVM 参数 {@code -Dsurveyking.crypto.key=...}</li>
 * </ol>
 * 值必须是 Base64 编码的 32 字节（256 位）。**密钥绝不能写进数据库或代码仓库**，
 * 否则加密没有意义。
 *
 * <p>没有配置密钥时自动降级为「不加密」（明文读写），保证老环境升级后仍能启动；
 * 启动日志会打一条 warn 提醒。
 */
public final class CryptoUtils {

	/** 密文前缀，用于区分历史明文数据 */
	public static final String PREFIX = "ENC1:";

	private static final String TRANSFORMATION = "AES/GCM/NoPadding";

	private static final String ENV_KEY = "SK_CRYPTO_KEY";

	private static final String PROP_KEY = "surveyking.crypto.key";

	private static final int IV_LENGTH = 12;

	private static final int TAG_BITS = 128;

	private static final SecureRandom RANDOM = new SecureRandom();

	private static volatile SecretKeySpec keySpec;

	private static volatile boolean initialized;

	private static volatile boolean warned;

	/**
	 * 运行时加密开关：由系统设置驱动。默认关闭——加密是可选功能，
	 * 关闭时数据以明文存取（与开启前行为一致）。
	 */
	private static volatile boolean switchOn;

	private CryptoUtils() {
	}

	/** 是否真正启用加密：开关打开 **且** 配置了密钥 */
	public static boolean enabled() {
		return switchOn && loadKey() != null;
	}

	/** 运行时开/关加密。关闭后新写入的是明文，存量密文需先执行解密迁移。 */
	public static void setSwitch(boolean on) {
		switchOn = on;
	}

	public static boolean isSwitchOn() {
		return switchOn;
	}

	/** 已经是密文就原样返回，避免二次加密 */
	public static String encryptIfNeeded(String plain) {
		if (plain == null || plain.isEmpty() || !enabled() || isEncrypted(plain)) {
			return plain;
		}
		return encrypt(plain);
	}

	/** 是密文就解密，历史明文原样返回（向后兼容） */
	public static String decryptIfNeeded(String stored) {
		if (stored == null || stored.isEmpty() || !isEncrypted(stored)) {
			return stored;
		}
		return decrypt(stored);
	}

	public static boolean isEncrypted(String value) {
		return value != null && value.startsWith(PREFIX);
	}

	public static String encrypt(String plain) {
		SecretKeySpec key = loadKey();
		if (key == null) {
			return plain;
		}
		try {
			byte[] iv = new byte[IV_LENGTH];
			RANDOM.nextBytes(iv);
			Cipher cipher = Cipher.getInstance(TRANSFORMATION);
			cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
			byte[] cipherText = cipher.doFinal(plain.getBytes(StandardCharsets.UTF_8));
			byte[] packed = new byte[iv.length + cipherText.length];
			System.arraycopy(iv, 0, packed, 0, iv.length);
			System.arraycopy(cipherText, 0, packed, iv.length, cipherText.length);
			return PREFIX + Base64.getEncoder().encodeToString(packed);
		}
		catch (Exception e) {
			throw new IllegalStateException("题库字段加密失败", e);
		}
	}

	public static String decrypt(String stored) {
		SecretKeySpec key = loadKey();
		if (key == null) {
			throw new IllegalStateException("数据已加密，但当前环境没有配置 " + ENV_KEY + "，无法读取");
		}
		try {
			byte[] packed = Base64.getDecoder().decode(stored.substring(PREFIX.length()));
			byte[] iv = new byte[IV_LENGTH];
			System.arraycopy(packed, 0, iv, 0, IV_LENGTH);
			byte[] cipherText = new byte[packed.length - IV_LENGTH];
			System.arraycopy(packed, IV_LENGTH, cipherText, 0, cipherText.length);
			Cipher cipher = Cipher.getInstance(TRANSFORMATION);
			cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
			return new String(cipher.doFinal(cipherText), StandardCharsets.UTF_8);
		}
		catch (Exception e) {
			throw new IllegalStateException("题库字段解密失败，密钥可能已更换", e);
		}
	}

	/** 环境里是否已配置密钥（与开关无关） */
	public static boolean keyPresent() {
		return loadKey() != null;
	}

	/** 当前生效密钥的 Base64；未配置返回 null。用于「下载密钥」必须给真实那把 */
	public static String currentKeyBase64() {
		SecretKeySpec spec = loadKey();
		return spec == null ? null : Base64.getEncoder().encodeToString(spec.getEncoded());
	}

	/**
	 * 生成一把新密钥、立即生效并落盘，返回 Base64。
	 *
	 * <p>落盘路径由 {@code surveyking.crypto.key-file} 决定，默认工作目录下的 crypto.key，
	 * 与 scripts/dev/start-backend.ps1 读取的是同一个文件。这样「下载的密钥」与「实际加密用的密钥」
	 * 保证是同一把，重启后也仍然可用。
	 */
	public static synchronized String generateAndActivate() {
		byte[] raw = new byte[32];
		RANDOM.nextBytes(raw);
		String base64 = Base64.getEncoder().encodeToString(raw);
		keySpec = new SecretKeySpec(raw, "AES");
		initialized = true;
		writeKeyFile(base64);
		return base64;
	}

	private static void writeKeyFile(String base64) {
		String path = System.getProperty("surveyking.crypto.key-file", "crypto.key");
		try {
			java.io.File file = new java.io.File(path);
			java.io.File parent = file.getParentFile();
			if (parent != null && !parent.exists()) {
				parent.mkdirs();
			}
			java.nio.file.Files.write(file.toPath(), base64.getBytes(StandardCharsets.US_ASCII));
		}
		catch (Exception e) {
			throw new IllegalStateException("密钥已生成但写入文件失败（" + path + "），请手工保存： " + base64, e);
		}
	}

	private static SecretKeySpec loadKey() {
		if (initialized) {
			return keySpec;
		}
		synchronized (CryptoUtils.class) {
			if (initialized) {
				return keySpec;
			}
			String raw = System.getenv(ENV_KEY);
			if (raw == null || raw.trim().isEmpty()) {
				raw = System.getProperty(PROP_KEY);
			}
			if (raw != null && !raw.trim().isEmpty()) {
				byte[] bytes = Base64.getDecoder().decode(raw.trim());
				if (bytes.length != 32) {
					throw new IllegalStateException(
							ENV_KEY + " 必须是 Base64 编码的 32 字节（256 位）密钥，当前长度 " + bytes.length);
				}
				keySpec = new SecretKeySpec(bytes, "AES");
			}
			else if (!warned) {
				warned = true;
				System.err.println("[crypto] 未配置 " + ENV_KEY + "，题库字段将以明文存储（仅建议在开发环境）");
			}
			initialized = true;
			return keySpec;
		}
	}
}
