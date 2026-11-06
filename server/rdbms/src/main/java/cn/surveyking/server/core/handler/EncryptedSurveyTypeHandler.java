package cn.surveyking.server.core.handler;

import cn.surveyking.server.core.uitls.CryptoUtils;
import cn.surveyking.server.domain.dto.SurveySchema;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;

/**
 * 题库类 JSON 字段的加密读写。
 *
 * <p>挂在 {@code t_template.template}（每道题）和 {@code t_project.survey}（整卷快照）上：
 * 写入时序列化成 JSON 后用 AES-256-GCM 加密，读取时自动解密。
 * 历史明文数据（没有 {@code ENC1:} 前缀）照常读取，因此升级不需要停机迁移。
 *
 * <p>没有配置密钥时（{@link CryptoUtils#enabled()} 为 false）等价于原来的 JacksonTypeHandler。
 */
public class EncryptedSurveyTypeHandler extends JacksonTypeHandler {

	public EncryptedSurveyTypeHandler() {
		super(SurveySchema.class);
	}

	public EncryptedSurveyTypeHandler(Class<?> type) {
		super(type);
	}

	@Override
	protected Object parse(String json) {
		return super.parse(CryptoUtils.decryptIfNeeded(json));
	}

	@Override
	protected String toJson(Object obj) {
		return CryptoUtils.encryptIfNeeded(super.toJson(obj));
	}
}
