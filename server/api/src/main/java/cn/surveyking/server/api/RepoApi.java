package cn.surveyking.server.api;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.exception.InternalServerError;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.*;
import cn.surveyking.server.service.RepoPartnerService;
import cn.surveyking.server.service.RepoService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;

/**
 * @author javahuang
 * @date 2022/4/27
 */
@RequestMapping("${api.prefix}/repo")
@RequiredArgsConstructor
@RestController
public class RepoApi {

	private final RepoService repoService;

	private final RepoPartnerService repoPartnerService;

	/** 导出密码校验 + 审计记录 */
	private final cn.surveyking.server.service.ExportGuardService exportGuardService;

	/**
	 * @param query
	 * @return
	 */
	@GetMapping("/list")
	@PreAuthorize("hasAnyAuthority('repo:list', 'exercise:list')")
	public PaginationResponse<RepoView> listRepo(RepoQuery query) {
		if (!SecurityContextUtils.hasAuthority("repo:list")) {
			query.setIsPractice(true);
			query.setMemberOnly(true);
		}
		return repoService.listRepo(query);
	}

	@GetMapping("/detail")
	@PreAuthorize("hasAuthority('repo:detail')")
	public RepoView getRpo(@RequestParam String id) {
		return repoService.getRpo(id);
	}

	@PostMapping("/create")
	@PreAuthorize("hasAuthority('repo:create')")
	public void addRepo(@RequestBody @Valid RepoRequest request) {
		repoService.addRepo(request);
	}

	@PostMapping("/update")
	@PreAuthorize("hasAuthority('repo:update')")
	public void updateRepo(@RequestBody @Valid RepoRequest request) {
		repoService.updateRepo(request);
	}

	@PostMapping("/delete")
	@PreAuthorize("hasAuthority('repo:delete')")
	public void deleteRepo(@RequestBody RepoRequest request) {
		repoService.deleteRepo(request);
	}

	@GetMapping("/partner/list")
	@PreAuthorize("hasAuthority('repo:list')")
	public PaginationResponse<RepoPartnerView> listRepoPartner(RepoPartnerQuery query) {
		return repoPartnerService.listRepoPartner(query);
	}

	@PostMapping("/partner/create")
	@PreAuthorize("hasAuthority('repo:grant') or hasRole('admin')")
	public void addRepoPartner(@RequestBody RepoPartnerRequest request) {
		repoPartnerService.addRepoPartner(request);
	}

	@PostMapping("/partner/delete")
	@PreAuthorize("hasAuthority('repo:grant') or hasRole('admin')")
	public void deleteRepoPartner(@RequestBody RepoPartnerRequest request) {
		repoPartnerService.deleteRepoPartner(request);
	}

	@PostMapping("/batchCreate")
	@PreAuthorize("hasAuthority('repo:create')")
	public void batchAddRepoTemplate(@RequestBody RepoTemplateRequest request) {
		repoService.batchAddRepoTemplate(request);
	}

	@PostMapping("/unbind")
	@PreAuthorize("hasAuthority('repo:update')")
	public void batchUnBindTemplate(@RequestBody RepoTemplateRequest request) {
		repoService.batchUnBindTemplate(request);
	}

	/**
	 * 从题库里面挑选试题
	 * @param repos
	 * @return
	 */
	@PostMapping("/pick")
	// 随机练习从题库抽题：学员只有 repo:book，也要能抽题，否则练习页直接 403
	@PreAuthorize("hasAnyAuthority('repo:detail','repo:book') or hasRole('admin')")
	public List<SurveySchema> pickQuestionFromRepo(@RequestBody List<ProjectSetting.RandomSurveyCondition> repos) {
		return repoService.pickQuestionFromRepo(repos);
	}

	@PostMapping("/import")
	// 只往已存在题库里加题目：统一用 template:import（原 repo:import 已合并到这里）。
	// 两者差异是「能不能新建题库」，导入题目本身是同一个动作。
	@PreAuthorize("hasAuthority('template:import') or hasRole('admin')")
	public void importFromTemplate(RepoTemplateRequest request) {
		try {
			repoService.importFromTemplate(request);
			exportGuardService.record(cn.surveyking.server.service.ExportGuardService.IMPORT_REPO, request.getRepoId(),
					null, "导入题库");
		}
		catch (ErrorCodeException ex) {
			throw ex;
		}
		catch (Exception ex) {
			throw new InternalServerError(ex.getMessage() != null ? ex.getMessage() : "题库模板导入失败", ex);
		}
	}

	/**
	 * 我的笔记
	 * @param query
	 * @return
	 */
	@GetMapping("/book/list")
	@PreAuthorize("hasAuthority('repo:book')")
	public PaginationResponse<UserBookView> listUserBook(UserBookQuery query) {
		return repoService.listUserBook(query);
	}

	@GetMapping("/book/question")
	@PreAuthorize("hasAuthority('repo:book')")
	public SurveySchema getUserBookQuestion(@RequestParam String id,
			@RequestParam(required = false) Boolean withAnswer) {
		return repoService.getUserBookQuestion(id, withAnswer);
	}

	@PostMapping("/book/create")
	@PreAuthorize("hasAuthority('repo:book')")
	public void createUserBook(@RequestBody UserBookRequest request) {
		repoService.createUserBook(request);
	}

	@PostMapping("/book/update")
	@PreAuthorize("hasAuthority('repo:book')")
	public UserBookView updateUserBook(@RequestBody UserBookRequest request) {
		return repoService.updateUserBook(request);
	}

	/**
	 * 我的笔记
	 * @param request
	 * @return
	 */
	@PostMapping("/book/delete")
	@PreAuthorize("hasAuthority('repo:book')")
	public void deleteUserBook(@RequestBody UserBookRequest request) {
		repoService.deleteUserBook(request);
	}

	/**
	 * 导出题库题目
	 * @param request
	 */
	@GetMapping("/export")
	@PreAuthorize("hasAuthority('repo:export')")
	public void exportRepoQuestions(RepoRequest request,
			@RequestParam(value = "exportToken", required = false) String exportToken,
			@RequestParam(value = "exportPassword", required = false) String exportPassword) {
		// 导出题库是最容易带走资产的动作：优先用一次性 token（密码不出现在 URL），
		// 仍保留 exportPassword 兼容旧调用
		if (exportToken != null && !exportToken.isEmpty()) {
			exportGuardService.assertTokenAllowed(exportToken);
		}
		else {
			exportGuardService.assertExportAllowed(exportPassword);
		}
		repoService.exportRepoQuestions(request);
		exportGuardService.record(cn.surveyking.server.service.ExportGuardService.EXPORT_REPO, request.getId(),
				request.getName(), "导出题库题目");
	}

	/** 用导出密码换一次性导出令牌（密码只走请求体，不落日志/历史） */
	@PostMapping("/export/token")
	@PreAuthorize("hasAuthority('repo:export') or hasAuthority('answer:export')")
	public java.util.Map<String, Object> exportToken(@RequestBody(required = false) java.util.Map<String, String> body) {
		return exportGuardService.issueToken(body == null ? null : body.get("exportPassword"));
	}


}