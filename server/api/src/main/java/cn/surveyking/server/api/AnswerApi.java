package cn.surveyking.server.api;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.core.annotation.EnableDataPerm;
import cn.surveyking.server.domain.dto.*;
import cn.surveyking.server.service.AnswerService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
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
	@EnableDataPerm(key = "#query.projectId")
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
			ResponseEntity<Resource> response = answerService.download(query);
			exportGuardService.record(cn.surveyking.server.service.ExportGuardService.EXPORT_ANSWER,
					query.getProjectId(), null, "导出答卷");
			return response;
		}
		finally {
			LocaleContextHolder.setLocale(previous);
		}
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