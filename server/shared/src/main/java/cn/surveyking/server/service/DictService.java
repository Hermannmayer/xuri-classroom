package cn.surveyking.server.service;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.domain.dto.*;

import java.util.List;





public interface DictService {

	PaginationResponse<CommDictView> listDict(CommDictQuery query);

	void addDict(CommDictRequest request);

	void updateDict(CommDictRequest request);

	void deleteDict(String id);

	PaginationResponse<CommDictItemView> listDictItem(CommDictItemQuery query);

	void saveOrUpdateDictItem(CommDictItemRequest request);

	void deleteDictItem(String id);

	void importDictItem(CommDictItemRequest request);

	List<CommDictView> selectDict();

}
