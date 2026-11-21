package cn.surveyking.server.service;

import cn.surveyking.server.core.constant.TagCategoryEnum;
import cn.surveyking.server.domain.dto.SelectTagRequest;

import java.util.Set;





public interface TagService {

	void batchAddTag(String entityId, TagCategoryEnum category, String[] tagArr);

	void deleteTagByEntryId(String entityId);

	Set<String> selectTag(SelectTagRequest request);

}
