package cn.surveyking.server.api;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.core.annotation.EnableDataPerm;
import cn.surveyking.server.core.uitls.HTTPUtils;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.*;
import cn.surveyking.server.service.AnswerService;
import cn.surveyking.server.service.ClassService;
import cn.surveyking.server.service.ProjectPartnerService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;
import java.util.Locale;

/**
 * @author javahuang
 * @date 2021/8/6
 */
@RestController
@RequestMapping("${api.prefix}/answer")
@RequiredArgsConstructor
public class AnswerApi {

	private final AnswerService answerService;

	/** 导出密码校验 + 审计记录 */
	private final cn.surveyking.server.service.ExportGuardService exportGuardService;

	/** 按班导出时校验「这个班在不在你的可见范围」 */
	private final ClassService classService;

	/** 不带班级范围的通用导出仍要项目数据权限（等价于原 @EnableDataPerm） */
	private final ProjectPartnerService projectPartnerService;

	/**
	 * 获取答案列表。
	 * @param query 查询参数。
	 * @return 当前答案。
	 */
	@PreAuthorize("hasAuthority('answer:list')")
	@EnableDataPerm(key = "#query.projectId")
	@GetMapping("/list")
	public PaginationResponse<AnswerView> listAnswer(AnswerQuery query) {
		return answerService.listAnswer(query);
	}

	/**
	 * 获取删除的答案。
	 * @param query 查询参数。
	 * @return
	 */
	@PreAuthorize("hasAuthority('answer:list')")
	@EnableDataPerm(key = "#query.projectId")
	@GetMapping("/trash")
	public List<AnswerView> listAnswerDeleted(AnswerQuery query) {
		return answerService.listAnswerDeleted(query);
	}

	/**
	 * 获取答案
	 * @param query 查询结果。
	 * @return
	 */
	@GetMapping
	@PreAuthorize("hasAuthority('answer:detail')")
	public AnswerView getAnswer(AnswerQuery query) {
		return answerService.getAnswerWithPermission(query);
	}

	/**
	 * 数据表格保存答案。
	 * @param request 保存的答案。
	 * @param request
	 */
	@PostMapping("/create")
	@PreAuthorize("hasAuthority('answer:create')")
	@EnableDataPerm(key = "#request.projectId")
	public void saveAnswer(@RequestBody AnswerRequest request) {
		answerService.saveAnswer(request);
	}

	/**
	 * 更新答案
	 * @param request
	 */
	@PostMapping("/update")
	@PreAuthorize("hasAuthority('answer:update')")
	public void updateAnswer(@RequestBody AnswerRequest request) {
		answerService.updateAnswerWithPermission(request);
	}

	/**
	 * 删除答案，答案放到回收站
	 * @param request 请求参数
	 */
	@PostMapping("/delete")
	@PreAuthorize("hasAuthority('answer:delete')")
	public void deleteAnswer(@RequestBody AnswerRequest request) {
		answerService.deleteAnswer(request);
	}

	/**
	 * 从回收站里面清空答案
	 * @param request
	 */
	@PreAuthorize("hasAuthority('answer:delete')")
	@PostMapping("/destroy")
	public void batchDestroyAnswer(@RequestBody AnswerRequest request) {
		answerService.batchDestroyAnswer(request);
	}

	/**
	 * 从回收站里面恢复答案
	 * @param request
	 */
	@PreAuthorize("hasAuthority('answer:restore') or hasRole('admin')")
	@PostMapping("/restore")
	public void restoreAnswer(@RequestBody AnswerRequest request) {
		answerService.restoreAnswer(request);
	}

	/**
	 * 答案导出
	 * @param query 答案导出查询请求
	 * @return
	 */
	@GetMapping("/download")
	@PreAuthorize("hasAuthority('answer:export')")
	// 数据范围在方法内分流：带 classId → 班级可见即可（classService.assertVisible）；
	// 不带 classId → 仍等价于原来的 @EnableDataPerm(key = "#query.projectId")（管理员/所有者/协作者）。
	// 之所以不能继续用方法级注解：按班导出面向「班级可见但不是项目协作者」的老师，注解会先把它挡在门外。
	public ResponseEntity<Resource> download(DownloadQuery query,
			@RequestParam(value = "exportToken", required = false) String exportToken,
			@RequestParam(value = "exportPassword", required = false) String exportPassword) {
		// 答卷含学员姓名/成绩，属于个人数据：优先一次性 token，保留密码参数兼容旧调用
		if (exportToken != null && !exportToken.isEmpty()) {
			exportGuardService.assertTokenAllowed(exportToken);
		}
		else {
			exportGuardService.assertExportAllowed(exportPassword);
		}
		Locale previous = LocaleContextHolder.getLocale();
		setLocale(query.getLocale());
		try {
			ResponseEntity<Resource> response;
			if (StringUtils.hasText(query.getClassId())) {
				// 按班导出：先校验班级可见性（学员即使有 answer:export，也只能导自己可见的班），
				// 再只导出该班的答卷；不带 classId 的通用导出保持原逻辑不变。
				classService.assertVisible(query.getClassId());
				response = toResourceResponse(answerService.downloadByClass(query));
			}
			else {
				assertProjectExportAllowed(query.getProjectId());
				response = answerService.download(query);
			}
			exportGuardService.record(cn.surveyking.server.service.ExportGuardService.EXPORT_ANSWER,
					query.getProjectId(), null, "导出答卷");
			return response;
		}
		finally {
			LocaleContextHolder.setLocale(previous);
		}
	}

	/**
	 * 用导出密码换一次性导出令牌（答卷含学员姓名/成绩，属于个人数据）。
	 *
	 * <p>导出是 GET 下载，密码不能放 query（会永久留在访问日志与浏览器历史里）：先 POST 换 token，
	 * 再用 {@code /download?exportToken=...} 下载。与 {@code /api/repo/export/token} 同一套实现。
	 */
	@PostMapping("/export/token")
	@PreAuthorize("hasAuthority('answer:export')")
	public java.util.Map<String, Object> exportToken(
			@RequestBody(required = false) java.util.Map<String, String> body) {
		return exportGuardService.issueToken(body == null ? null : body.get("exportPassword"));
	}

	/**
	 * 不带班级范围时的项目数据权限校验，等价于原来的 {@code @EnableDataPerm(key = "#query.projectId")}：
	 * 管理员放行；其余要求是项目所有者/协作者（含按用户组授权）。
	 */
	private void assertProjectExportAllowed(String projectId) {
		if (SecurityContextUtils.isAdmin()) {
			return;
		}
		if (!StringUtils.hasText(projectId)) {
			throw new AccessDeniedException("未找到对应的问卷");
		}
		if (!projectPartnerService.getProjectPerms().contains(projectId)) {
			throw new AccessDeniedException("没有权限访问本问卷");
		}
	}

	/** 把下载数据包装成下载响应（与 AnswerService#download 的默认实现保持一致的头） */
	private ResponseEntity<Resource> toResourceResponse(DownloadData download) {
		return ResponseEntity.ok()
				.header(HttpHeaders.CONTENT_DISPOSITION, HTTPUtils.getContentDispositionValue(download.getFileName()))
				.contentType(download.getMediaType()).body(download.getResource());
	}

	private void setLocale(String localeStr) {
		if (!StringUtils.hasText(localeStr)) {
			return;
		}
		String normalized = localeStr.replace('_', '-');
		LocaleContextHolder.setLocale(Locale.forLanguageTag(normalized));
	}

	/**
	 * 后台补录答卷：从 Excel 导入整份答卷数据（前端「数据与分析 → 导入数据」调的就是这里）。
	 *
	 * <p>
	 * 权限区分（本次细分，两个权限点不要混用）：
	 * <ul>
	 * <li>{@code answer:upload}：后台补录/导入答卷，属于管理侧写操作，所以这里保持只认它，不放开给学员；</li>
	 * <li>{@code answer:attach}：学员在答题页上传附件。答题页走的是公开接口
	 * {@code POST /api/public/upload}（{@code SurveyApi}，无需权限）；将来如果出现「需要登录态的
	 * 答题附件接口」，注解应写成 {@code hasAnyAuthority('answer:attach','answer:upload')}，
	 * 用 answer:upload 兜住老角色，别直接把老权限删掉。</li>
	 * </ul>
	 * @param request 上传的 Excel 文件与 projectId
	 * @return 导入结果（projectId + schema）
	 */
	@PostMapping("/upload")
	@PreAuthorize("hasAuthority('answer:upload')")
	public AnswerUploadView upload(AnswerUploadRequest request) {
		return answerService.upload(request);
	}

}