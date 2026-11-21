package cn.surveyking.server.domain.mapper;

import cn.surveyking.server.core.base.mapper.BaseModelMapper;
import cn.surveyking.server.domain.dto.CommDictItemRequest;
import cn.surveyking.server.domain.dto.CommDictItemView;
import cn.surveyking.server.domain.model.CommDictItem;
import org.mapstruct.Mapper;





@Mapper
public interface CommDictItemViewMapper extends BaseModelMapper<CommDictItemRequest, CommDictItemView, CommDictItem> {

}
