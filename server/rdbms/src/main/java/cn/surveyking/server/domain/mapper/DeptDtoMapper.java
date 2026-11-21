package cn.surveyking.server.domain.mapper;

import cn.surveyking.server.core.base.mapper.BaseModelMapper;
import cn.surveyking.server.domain.dto.DeptRequest;
import cn.surveyking.server.domain.dto.DeptView;
import cn.surveyking.server.domain.model.Dept;
import org.mapstruct.Mapper;

import java.util.List;





@Mapper
public interface DeptDtoMapper extends BaseModelMapper<DeptRequest, DeptView, Dept> {

}
