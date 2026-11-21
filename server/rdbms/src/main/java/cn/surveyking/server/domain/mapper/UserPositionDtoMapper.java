package cn.surveyking.server.domain.mapper;

import cn.surveyking.server.core.base.mapper.BaseModelMapper;
import cn.surveyking.server.domain.dto.UserPositionRequest;
import cn.surveyking.server.domain.dto.UserPositionView;
import cn.surveyking.server.domain.model.UserPosition;
import org.mapstruct.Mapper;

import java.util.List;





@Mapper
public interface UserPositionDtoMapper extends BaseModelMapper<UserPositionRequest, UserPositionView, UserPosition> {

}
