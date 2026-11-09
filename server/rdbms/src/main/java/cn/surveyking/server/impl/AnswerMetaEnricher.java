package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.uitls.ContextHelper;
import cn.surveyking.server.domain.dto.AnswerMetaInfo;
import org.springframework.stereotype.Component;

/**
 * 答卷来源信息补齐：从 {@code AnswerServiceImpl#enrichMetaInfo} 切出。
 *
 * <p>
 * 无依赖、不读写数据库，取不到请求上下文时原样返回。
 */
@Component
public class AnswerMetaEnricher {

	/**
	 * 补齐答卷的来源信息（IP / 设备 cookie），供「每 IP 限次」「每台设备限次」统计使用。 已有值不覆盖；取不到请求上下文（如异步线程）时原样返回。
	 */
	public AnswerMetaInfo enrichMetaInfo(AnswerMetaInfo metaInfo) {
		AnswerMetaInfo meta = metaInfo == null ? new AnswerMetaInfo() : metaInfo;
		try {
			javax.servlet.http.HttpServletRequest request = ContextHelper.getCurrentHttpRequest();
			if (request == null) {
				return meta;
			}
			AnswerMetaInfo.ClientInfo client = meta.getClientInfo();
			if (client == null) {
				client = new AnswerMetaInfo.ClientInfo();
				meta.setClientInfo(client);
			}
			if (!org.springframework.util.StringUtils.hasText(client.getRemoteIp())) {
				client.setRemoteIp(cn.surveyking.server.core.uitls.IPUtils.getClientIpAddress(request));
			}
			if (!org.springframework.util.StringUtils.hasText(client.getCookie())) {
				javax.servlet.http.Cookie limitCookie = org.springframework.web.util.WebUtils.getCookie(request,
						AppConsts.COOKIE_LIMIT_NAME);
				if (limitCookie != null) {
					client.setCookie(limitCookie.getValue());
				}
			}
		}
		catch (Exception ignored) {
			// 补齐失败不影响提交
		}
		return meta;
	}

}
