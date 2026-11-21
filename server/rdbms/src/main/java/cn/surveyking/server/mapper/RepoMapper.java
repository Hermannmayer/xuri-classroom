package cn.surveyking.server.mapper;

import cn.surveyking.server.domain.dto.RepoQuestionTypeTotalView;
import cn.surveyking.server.domain.dto.TemplateTagTotalView;
import cn.surveyking.server.domain.model.Repo;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import java.util.List;




public interface RepoMapper extends BaseMapper<Repo> {

	/** 题库中问题按照标签分类统计数量 */
	List<TemplateTagTotalView> selectRepoTemplateTags(String repoId);

	/** 题库中按照问题分类统计数量 */
	List<RepoQuestionTypeTotalView> selectRepoQuestionTypes(String repoId);

}
