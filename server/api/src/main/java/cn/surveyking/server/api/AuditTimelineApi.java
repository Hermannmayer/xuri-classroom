package cn.surveyking.server.api;

import cn.surveyking.server.domain.dto.AuditAnswerTimelineView;
import cn.surveyking.server.service.AnswerTimelineService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 答卷操作时间线（计划 §5.4）。
 *
 * <p>路径按计划文档定成 {@code /api/audit/answer-timeline}，所以单独一个 Controller，
 * 没有并到 {@code /api/system/audit} 下：那一组是管理员专用的操作日志（{@code system:log:list}），
 * 而这里老师和学员本人也要看，混在一个前缀里很容易被整段权限规则顺手挡掉。
 *
 * <p>权限：{@code answer:detail}（老师/学员都有），行级范围由
 * {@code AnswerAccessGuard#assertAnswerAccess} 在 Service 里判：本人 / 项目所有者或协作者 / 管理员。
 *
 * @author audit
 */
@RestController
@RequestMapping("${api.prefix}/audit")
@RequiredArgsConstructor
public class AuditTimelineApi {

	private final AnswerTimelineService answerTimelineService;

	/**
	 * 某份答卷的操作记录：谁在什么时候把哪道题从几分改成几分。
	 * @param answerId 答卷 id
	 */
	@GetMapping("/answer-timeline")
	@PreAuthorize("hasAuthority('answer:detail')")
	public List<AuditAnswerTimelineView> answerTimeline(@RequestParam String answerId) {
		return answerTimelineService.answerTimeline(answerId);
	}

}
