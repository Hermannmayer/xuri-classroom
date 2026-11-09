package cn.surveyking.server.mapper;

import cn.surveyking.server.domain.model.ProjectPartner;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import java.util.List;

/**
 * @Entity cn.surveyking.server.domain.model.ProjectPartner
 */
public interface ProjectPartnerMapper extends BaseMapper<ProjectPartner> {

	List<String> getProjectPerms(String userId);

}
