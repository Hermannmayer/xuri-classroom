package cn.surveyking.server.service;

import cn.surveyking.server.domain.dto.TeachingClassView;
import cn.surveyking.server.domain.dto.TeachingProjectView;

import java.util.List;








public interface TeachingService {

	/** 当前用户参与的试卷（自己出的 + 被授权协作的） */
	List<TeachingProjectView> listMyProjects(String userId);

	/** 某份试卷对应的班级作答概况 */
	List<TeachingClassView> listClasses(String projectId);

}
