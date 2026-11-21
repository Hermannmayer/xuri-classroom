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













@RestController
@RequestMapping("${api.prefix}/audit")
@RequiredArgsConstructor
public class AuditTimelineApi {

	private final AnswerTimelineService answerTimelineService;





	@GetMapping("/answer-timeline")
	@PreAuthorize("hasAuthority('answer:detail')")
	public List<AuditAnswerTimelineView> answerTimeline(@RequestParam String answerId) {
		return answerTimelineService.answerTimeline(answerId);
	}

}
