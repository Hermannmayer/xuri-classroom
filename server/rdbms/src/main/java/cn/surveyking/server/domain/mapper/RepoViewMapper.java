package cn.surveyking.server.domain.mapper;

import cn.surveyking.server.core.base.mapper.BaseModelMapper;
import cn.surveyking.server.domain.dto.RepoRequest;
import cn.surveyking.server.domain.dto.RepoView;
import cn.surveyking.server.domain.model.Repo;
import org.mapstruct.Mapper;





@Mapper(componentModel = "spring")
public interface RepoViewMapper extends BaseModelMapper<RepoRequest, RepoView, Repo> {

}
