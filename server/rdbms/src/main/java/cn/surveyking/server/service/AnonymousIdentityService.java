package cn.surveyking.server.service;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * 公开问卷的匿名答题身份。
 *
 * <p>cookie 名 {@code sk-anon}，HttpOnly + SameSite=Lax + 90 天；服务端只保存 token 的
 * SHA-256。匿名主体用于「未登录也能找回自己的历次作答」，登录后可通过 {@link #claim(String)}
 * 把当前浏览器下的匿名答卷认领到账号。
 *
 * @author surveyking
 */
public interface AnonymousIdentityService {

	/**
	 * 读取/创建当前浏览器的匿名主体，并把 cookie 写回响应。
	 * @param request 当前请求（判断 Secure）
	 * @param response 当前响应（写 Set-Cookie）
	 * @return 匿名主体 id；无法创建时返回 null
	 */
	String ensureSubject(HttpServletRequest request, HttpServletResponse response);

	/**
	 * 读取当前请求 cookie 对应的有效匿名主体 id；没有/过期返回 null。
	 * <p>有效访问会顺带更新 last_seen_at。
	 */
	String currentSubjectId();

	/**
	 * 把当前 cookie 主体下的匿名答卷认领到登录用户：create_by=userId、is_anonymous=0、
	 * anonymous_subject_id=null，并按班级资源重新解析 class_id。
	 * @return 实际认领的答卷条数
	 */
	int claim(String userId);

	/**
	 * 清理过期匿名主体及其匿名答卷；暂未接调度，供运维/定时任务调用。
	 */
	void purgeExpired();

}
