package cn.surveyking.server.mapper;

import cn.surveyking.server.domain.model.Project;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import java.util.List;

/**
 * @author javahuang
 * @date 2021/8/6
 */
public interface ProjectMapper extends BaseMapper<Project> {

	List<Project> selectLogicDeleted(String userId);

	void batchDestroy(List<String> ids);

	void restoreProject(List<String> ids);

}
