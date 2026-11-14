package cn.surveyking.server.service;

import cn.surveyking.server.core.importer.ImportParseRequest;
import cn.surveyking.server.core.importer.ImportPreview;
import cn.surveyking.server.domain.dto.PaperImportRecordRequest;

/**
 * 导入解析：只解析不落库，落库由调用方（新建试卷 / 追加题组 / 题库）决定。
 */
public interface ImportService {

	ImportPreview parse(ImportParseRequest request);

	void recordPaperImport(PaperImportRecordRequest request);

}
