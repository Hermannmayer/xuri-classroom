package cn.surveyking.server.api;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.domain.dto.AnswerRequest;
import cn.surveyking.server.domain.dto.ExerciseView;
import cn.surveyking.server.domain.dto.HistoryExerciseQuery;
import cn.surveyking.server.service.AnswerService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

@RestController
@RequestMapping("${api.prefix}/exercise")
@RequiredArgsConstructor
public class ExerciseApi {

	private final AnswerService answerService;






	@GetMapping("/list")
	@PreAuthorize("hasAuthority('exercise:list')")
	public PaginationResponse<ExerciseView> historyExercise(@Valid HistoryExerciseQuery query) {
		return answerService.historyExercise(query);
	}





	@PostMapping("/delete")
	@PreAuthorize("hasAuthority('exercise:list')")
	public void deleteExercise(@RequestBody AnswerRequest request) {
		answerService.deleteExercise(request);
	}

}
