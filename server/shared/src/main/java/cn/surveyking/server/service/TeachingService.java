package cn.surveyking.server.service;

import cn.surveyking.server.domain.dto.TeachingClassView;
import cn.surveyking.server.domain.dto.TeachingProjectView;

import java.util.List;

/**
 * 教学工作台（老师视角）。
 *
 * <p>
 * 之前 {@code TeachingApi} 直接注入 {@code TeachingMapper}，是全仓唯一一个 Controller 直连 Mapper 的地方；
 * 补这层接口一是让 ArchUnit 的「api 不得依赖 mapper」规则成立，二是给教学查询留一个可加数据范围的位置。
 */
public interface TeachingService {

	/** 当前用户参与的试卷（自己出的 + 被授权协作的） */
	List<TeachingProjectView> listMyProjects(String userId);

	/** 某份试卷对应的班级作答概况 */
	List<TeachingClassView> listClasses(String projectId);

}
