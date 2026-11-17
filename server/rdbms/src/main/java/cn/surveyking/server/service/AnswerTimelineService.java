package cn.surveyking.server.service;

import cn.surveyking.server.domain.dto.AuditAnswerTimelineView;

import java.util.List;

/**
 * 答卷操作时间线（批改抽屉「操作记录」）。
 *
 * <p>单独开接口而不是塞进 {@code AuditLogService}：后者是管理员的操作日志查询，
 * 而这条链路要给老师和学员看，权限闸门是 {@code answerAccessGuard}（本人 / 项目所有者或协作者 / 管理员）。
 * 两个包之间不能互相依赖（ArchUnit 的 service→impl 规则），所以实现放 impl 包。
 *
 * @author audit
 */
public interface AnswerTimelineService {

	/**
	 * 某份答卷的审计时间线，按时间正序。
	 * @param answerId 答卷 id
	 * @return 时间线；没有记录时返回空列表
	 */
	List<AuditAnswerTimelineView> answerTimeline(String answerId);

}
