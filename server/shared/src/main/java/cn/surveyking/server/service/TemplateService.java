package cn.surveyking.server.service;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.domain.dto.*;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * @author javahuang
 * @date 2021/9/23
 */
public interface TemplateService {

	PaginationResponse<TemplateView> listTemplate(TemplateQuery query);

	String addTemplate(TemplateRequest template);

	void batchAddTemplate(List<TemplateRequest> templateRequests);

	void batchUpdateTemplate(List<TemplateRequest> templateRequests);

	/**
	 * 题库批量改标签/难度/分值（部分字段为空表示不改）
	 */
	void batchPatchTemplate(TemplateBatchRequest request);

	void updateTemplate(TemplateRequest request);

	void deleteTemplate(TemplateRequest request);

	Map<String, List<TemplateView>> selectTemplate(SelectTemplateRequest request);

	Set<String> listTemplateCategories(CategoryQuery query);

	Set<String> getTags(TagQuery query);

	TemplateView getTemplate(TemplateQuery query);

}
