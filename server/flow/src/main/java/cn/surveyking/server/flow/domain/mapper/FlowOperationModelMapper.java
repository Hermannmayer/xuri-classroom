package cn.surveyking.server.flow.domain.mapper;

import cn.surveyking.server.core.base.mapper.BaseModelMapper;
import cn.surveyking.server.flow.domain.dto.FlowOperationView;
import cn.surveyking.server.flow.domain.model.FlowOperation;
import org.mapstruct.Mapper;





@Mapper
public interface FlowOperationModelMapper extends BaseModelMapper<Void, FlowOperationView, FlowOperation> {

}
