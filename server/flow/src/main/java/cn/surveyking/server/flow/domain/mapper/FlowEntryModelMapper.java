package cn.surveyking.server.flow.domain.mapper;

import cn.surveyking.server.core.base.mapper.BaseModelMapper;
import cn.surveyking.server.flow.domain.dto.FlowEntryView;
import cn.surveyking.server.flow.domain.model.FlowEntry;
import org.mapstruct.Mapper;





@Mapper
public interface FlowEntryModelMapper extends BaseModelMapper<Void, FlowEntryView, FlowEntry> {

}
