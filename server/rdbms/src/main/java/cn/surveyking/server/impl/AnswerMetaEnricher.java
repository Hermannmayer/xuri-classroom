package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.uitls.ContextHelper;
import cn.surveyking.server.domain.dto.AnswerMetaInfo;
import org.springframework.stereotype.Component;







@Component
public class AnswerMetaEnricher {

	/** 补齐答卷的来源信息（IP / 设备 cookie），供「每 IP 限次」「每台设备限次」统计使用 */
	public AnswerMetaInfo enrichMetaInfo(AnswerMetaInfo metaInfo) {
		AnswerMetaInfo meta = metaInfo == null ? new AnswerMetaInfo() : metaInfo;
		try {
			jakarta.servlet.http.HttpServletRequest request = ContextHelper.getCurrentHttpRequest();
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
				jakarta.servlet.http.Cookie limitCookie = org.springframework.web.util.WebUtils.getCookie(request,
						AppConsts.COOKIE_LIMIT_NAME);
				if (limitCookie != null) {
					client.setCookie(limitCookie.getValue());
				}
			}
		}
		catch (Exception ignored) {

		}
		return meta;
	}

}
