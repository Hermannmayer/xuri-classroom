package cn.surveyking.server.domain.mapper;

import cn.surveyking.server.core.base.mapper.BaseModelMapper;
import cn.surveyking.server.domain.dto.DashboardRequest;
import cn.surveyking.server.domain.dto.DashboardView;
import cn.surveyking.server.domain.model.Dashboard;
import org.mapstruct.Mapper;





@Mapper
public interface DashboardViewMapper extends BaseModelMapper<DashboardRequest, DashboardView, Dashboard> {

}
