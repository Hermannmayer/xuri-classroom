/** AI 智能导入的服务契约：解析为预览结构、把模型 DSL 归一成预览。 */
package cn.surveyking.server.service;

import cn.surveyking.server.core.importer.ImportParseRequest;
import cn.surveyking.server.core.importer.ImportPreview;

/**
 * AI 智能导入：把上传文档/粘贴文本（含图片）交给模型读懂后转成与规则导入一致的预览结构。
 */
public interface AiImportService {

	/** 抽文本与图片 → 调模型 → 归一成 ImportPreview；读不到题目时抛中文错误 */
	ImportPreview parse(ImportParseRequest request);

	/** 把模型输出的纯文本 DSL 归一成 ImportPreview（不调模型）；标题为空时用 titleFallback */
	ImportPreview buildPreview(String aiText, String titleFallback);

}
