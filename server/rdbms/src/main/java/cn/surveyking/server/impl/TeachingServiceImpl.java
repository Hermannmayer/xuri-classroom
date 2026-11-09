package cn.surveyking.server.impl;

import cn.surveyking.server.domain.dto.TeachingClassView;
import cn.surveyking.server.domain.dto.TeachingProjectView;
import cn.surveyking.server.mapper.TeachingMapper;
import cn.surveyking.server.service.TeachingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TeachingServiceImpl implements TeachingService {

	private final TeachingMapper teachingMapper;

	@Override
	public List<TeachingProjectView> listMyProjects(String userId) {
		return teachingMapper.listMyProjects(userId);
	}

	@Override
	public List<TeachingClassView> listClasses(String projectId) {
		return teachingMapper.listClasses(projectId);
	}

}
