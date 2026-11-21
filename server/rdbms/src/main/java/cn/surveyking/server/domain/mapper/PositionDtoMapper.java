package cn.surveyking.server.domain.mapper;

import cn.surveyking.server.core.base.mapper.BaseModelMapper;
import cn.surveyking.server.domain.dto.PositionRequest;
import cn.surveyking.server.domain.dto.PositionView;
import cn.surveyking.server.domain.model.Position;
import org.mapstruct.Mapper;

import java.util.List;





@Mapper
public interface PositionDtoMapper extends BaseModelMapper<PositionRequest, PositionView, Position> {

}
