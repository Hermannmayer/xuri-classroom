package cn.surveyking.server.api;

import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.*;
import cn.surveyking.server.service.AnonymousIdentityService;
import cn.surveyking.server.service.FileService;
import cn.surveyking.server.service.SurveyService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import java.util.List;







@RequestMapping("${api.prefix}/public")
@RequiredArgsConstructor
@RestController
public class SurveyApi {

	private final SurveyService surveyService;

	private final cn.surveyking.server.impl.PublicQueryService publicQueryService;

	private final cn.surveyking.server.impl.ExamControlService examControlService;

	private final FileService fileService;


	private final AnonymousIdentityService anonymousIdentityService;

	/** 加载问卷 */
	@PostMapping("/loadProject")
	public PublicProjectView loadProject(@RequestBody ProjectQuery query, HttpServletRequest request,
			HttpServletResponse response) {
		PublicProjectView projectView = surveyService.loadProject(query);
		ensureAnonymousSubject(projectView, request, response);
		return projectView;
	}

	/** 首屏只返回项目设置与不含题干/选项的题目大纲 */
	@PostMapping("/projectOutline")
	public PublicProjectView projectOutline(@RequestBody ProjectQuery query) {
		return surveyService.loadProjectOutline(query);
	}

	/** 密码/登录校验成功后仍然只返回大纲 */
	@PostMapping("/validateProjectOutline")
	public PublicProjectView validateProjectOutline(@RequestBody ProjectQuery query) {
		return surveyService.validateProjectOutline(query);
	}

	/** 按题目 id 取单题；后端会重新校验项目访问权限，并验证题目属于当前问卷 */
	@PostMapping("/question")
	public SurveySchema question(@RequestBody PublicQuestionRequest request) {
		return surveyService.loadPublicQuestion(request);
	}

	/** 问卷校验 */
	@PostMapping("/validateProject")
	public PublicProjectView validateProject(@RequestBody ProjectQuery query) {
		return surveyService.validateProject(query);
	}

	/** 答案保存 */
	@PostMapping("/saveAnswer")
	public PublicAnswerView saveAnswer(@RequestBody AnswerRequest request) {
		PublicAnswerView publicAnswerView = surveyService.saveAnswer(request);
		return publicAnswerView;
	}

	/** 答案暂存，目前仅支持问题随机 */
	@PostMapping("/tempSaveAnswer")
	public void tempSaveAnswer(@RequestBody AnswerRequest request) {
		surveyService.tempSaveAnswer(request);
	}

	/** 上传文件 */
	@PostMapping("/upload")
	public FileView upload(UploadFileRequest request) {
		request.setPublicUpload(true);
		return fileService.upload(request);
	}

	/** 预览文件 */
	@GetMapping("/preview/{attachmentId}")
	public ResponseEntity<Resource> preview(@PathVariable("attachmentId") String attachmentId) {
		FileQuery query = new FileQuery(attachmentId);
		HttpHeaders headers = new HttpHeaders();
		headers.add(HttpHeaders.CACHE_CONTROL, CacheControl.maxAge(Duration.ofDays(30)).getHeaderValue());
		query.setDispositionType(AppConsts.DispositionTypeEnum.inline);
		query.setHeaders(headers);
		return fileService.loadPublicFile(query);
	}

	/** 返回 公开查询验证页面视图数据；返回 公开查询验证页面视图数据 */
	@PostMapping("/loadQuery")
	public PublicQueryVerifyView loadQuery(@RequestBody PublicQueryRequest request) {
		return publicQueryService.loadQuery(request);
	}

	/** 获取公开查询结果 */
	@PostMapping("/getQueryResult")
	public PublicQueryView getQueryResult(@RequestBody PublicQueryRequest request) {
		return publicQueryService.getQueryResult(request);
	}

	/** 问卷加载字典 */
	@PostMapping("/loadDict")
	public List<PublicDictView> loadDict(@RequestBody PublicDictRequest request) {
		return surveyService.loadDict(request);
	}

	/** 加载问卷结果 */
	@PostMapping("/loadExamResult")
	public PublicExamResult loadExamResult(@RequestBody PublicExamRequest request) {
		return surveyService.loadExamResult(request);
	}

	/** 加载问卷关联结果 */
	@PostMapping("/loadLinkResult")
	public PublicLinkResult loadLinkResult(@RequestBody PublicLinkRequest request) {
		return surveyService.loadLinkResult(request);
	}

	/** 考试切屏计数：前端每次 visibilitychange 上报一次，返回累计次数（落库，刷新不丢）；返回 当前累计切屏次数 */
	@PostMapping("/exam/switch-screen")
	public Integer recordSwitchScreen(@RequestBody PublicSwitchScreenRequest request) {
		return examControlService.recordSwitchScreen(request);
	}

	/** 当前登录用户在这份试卷/问卷上的历次作答（用于「最高 X 分 · 共 N 次」与逐次查看成绩）；返回 按提交时间倒序的作答摘要 */
	@PostMapping("/attempts")
	public List<PublicAttemptView> listAttempts(@RequestBody PublicAttemptRequest request) {
		return surveyService.listPublicAttempts(request);
	}

	/** 当前浏览器（匿名 cookie）或当前登录用户的历次答卷摘要 */
	@GetMapping("/anonymous/answers")
	public List<PublicAttemptView> anonymousAnswers(@RequestParam("projectId") String projectId) {
		PublicAttemptRequest request = new PublicAttemptRequest();
		request.setProjectId(projectId);
		return surveyService.listPublicAttempts(request);
	}

	/** 登录后把当前 sk-anon 主体下的匿名答卷认领到账号，返回认领条数 */
	@PostMapping("/anonymous/claim")
	public int claimAnonymousAnswers() {
		if (!SecurityContextUtils.isAuthenticated()) {
			throw new AccessDeniedException("请先登录后找回匿名答卷");
		}
		return anonymousIdentityService.claim(SecurityContextUtils.getUserId());
	}

	/** 未登录且项目不要求登录时，确保浏览器有 sk-anon 主体；已登录不建匿名身份 */
	private void ensureAnonymousSubject(PublicProjectView projectView, HttpServletRequest request,
			HttpServletResponse response) {
		if (projectView == null || SecurityContextUtils.isAuthenticated()) {
			return;
		}
		ProjectSetting setting = projectView.getSetting();
		if (setting != null && setting.getAnswerSetting() != null
				&& Boolean.TRUE.equals(setting.getAnswerSetting().getLoginRequired())) {
			return;
		}
		anonymousIdentityService.ensureSubject(request, response);
	}

}
