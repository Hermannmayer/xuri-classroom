package cn.surveyking.server.service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;










public interface AnonymousIdentityService {

	/** 读取/创建当前浏览器的匿名主体，并把 cookie 写回响应；返回 匿名主体 id；无法创建时返回 null。 */
	String ensureSubject(HttpServletRequest request, HttpServletResponse response);

	/** 读取当前请求 cookie 对应的有效匿名主体 id；没有/过期返回 null */
	String currentSubjectId();

	/** 把当前 cookie 主体下的匿名答卷认领到登录用户：create_by=userId、is_anonymous=0、 anonymous_subject_id=null，并按班级资源重新解析 class_id；返回 实际认领的答卷条数。 */
	int claim(String userId);

	/** 清理过期匿名主体及其匿名答卷；暂未接调度，供运维/定时任务调用 */
	void purgeExpired();

	/** 清理「创建时间早于 N 天前」的匿名答卷，并删掉不再有匿名答卷的匿名主体；返回 逻辑删除的匿名答卷条数。 */
	int purgeOlderThan(int retentionDays);

	/** 物理清理**已经逻辑删除**的匿名答卷（连同签名图/上传附件一起删）；返回 物理删除的答卷条数。 */
	int purgeDeletedOlderThan(int delayDays);

}
