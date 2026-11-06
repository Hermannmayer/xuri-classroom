package cn.surveyking.server.api;

import cn.surveyking.server.service.CryptoMigrationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 题库字段加密的运维接口。
 *
 * <p>加密是**可选功能**：管理员在系统设置里打开才生效，关闭时数据以明文存取。
 * 打开/关闭都需要把存量数据整体迁移一遍（TypeHandler 只在写入时生效）。
 */
@RestController
@RequestMapping("/api/system/crypto")
@RequiredArgsConstructor
public class CryptoApi {

	private final CryptoMigrationService cryptoMigrationService;

	/** 当前是否启用加密、还剩多少明文/密文行 */
	@GetMapping("/status")
	@PreAuthorize("hasAnyAuthority('system:role:list','system:setting:update')")
	public Map<String, Object> status() {
		return cryptoMigrationService.status();
	}

	/**
	 * 把存量明文加密。
	 * 未配置密钥时会明确报错，不会静默成功。
	 */
	@PostMapping("/migrate")
	@PreAuthorize("hasAnyAuthority('system:role:list','system:setting:update')")
	public Map<String, Object> migrate() {
		return cryptoMigrationService.encryptAll();
	}

	/**
	 * 把存量密文还原成明文。关闭加密前必须先执行，否则 TypeHandler 会把读到的密文当明文序列化。
	 */
	@PostMapping("/decrypt")
	@PreAuthorize("hasAnyAuthority('system:role:list','system:setting:update')")
	public Map<String, Object> decrypt() {
		return cryptoMigrationService.decryptAll();
	}

	/**
	 * 生成一把新的加密密钥并返回给前端下载。
	 * 只返回一次，服务器不会把它写进数据库；管理员必须妥善保存，丢了数据无法解密。
	 */
	@GetMapping("/generate-key")
	@PreAuthorize("hasAnyAuthority('system:role:list','system:setting:update')")
	public Map<String, Object> generateKey() {
		return cryptoMigrationService.generateKey();
	}

}
