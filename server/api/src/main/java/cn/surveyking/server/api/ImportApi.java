package cn.surveyking.server.api;

import cn.surveyking.server.core.annotation.EnableDataPerm;
import cn.surveyking.server.core.importer.ImportParseRequest;
import cn.surveyking.server.core.importer.ImportPreview;
import cn.surveyking.server.domain.dto.PaperImportRecordRequest;
import cn.surveyking.server.service.ImportService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;




@RestController
@RequestMapping("${api.prefix}/import")
@RequiredArgsConstructor
public class ImportApi {

	private final ImportService importService;

	/** 解析导入文件/文本，返回题目树与预览统计 */
	@PostMapping("/parse")
	@PreAuthorize("hasAnyAuthority('project:create','project:update','template:import') or hasRole('admin')")
	public ImportPreview parse(ImportParseRequest request) {
		return importService.parse(request);
	}

	/** 导入完成后的审计记录（幂等，不改任何业务数据） */
	@PostMapping("/record")
	@PreAuthorize("hasAnyAuthority('project:update') or hasRole('admin')")
	@EnableDataPerm(key = "#request.projectId")
	public void record(@RequestBody PaperImportRecordRequest request) {
		importService.recordPaperImport(request);
	}

}
