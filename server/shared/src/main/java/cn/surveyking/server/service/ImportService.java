package cn.surveyking.server.service;

import cn.surveyking.server.core.importer.ImportParseRequest;
import cn.surveyking.server.core.importer.ImportPreview;
import cn.surveyking.server.domain.dto.PaperImportRecordRequest;




public interface ImportService {

	ImportPreview parse(ImportParseRequest request);

	void recordPaperImport(PaperImportRecordRequest request);

}
