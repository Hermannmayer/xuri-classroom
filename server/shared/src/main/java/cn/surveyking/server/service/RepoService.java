package cn.surveyking.server.service;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.domain.dto.*;

import java.util.List;





public interface RepoService {

	/** 返回 题库列表；返回 题库列表。 */
	PaginationResponse<RepoView> listRepo(RepoQuery query);

	/** 题库分类/文件夹列表（**扁平**返回，前端按 path 建树） */
	List<RepoCategoryView> listRepoCategories();

	/** 新建空分类/文件夹（不挂题库也能建） */
	void createRepoCategory(RepoCategoryRequest request);






	/** 题库统计：题量、题型/难度分布、练习概况；返回 统计结果。 */
	RepoReportView repoReport(String repoId);

	RepoView getRpo(String id);

	/** 添加题库 */
	void addRepo(RepoRequest request);

	/** 更新题库 */
	void updateRepo(RepoRequest request);

	/** 删除题库 */
	void deleteRepo(RepoRequest request);

	/** 批量添加题库模板 */
	void batchAddRepoTemplate(RepoTemplateRequest request);

	/** 解除题库与模板的绑定关系 */
	void batchUnBindTemplate(RepoTemplateRequest request);

	/** 从题库里面挑选试题 */
	List<SurveySchema> pickQuestionFromRepo(List<ProjectSetting.RandomSurveyCondition> repos);

	void importFromTemplate(RepoTemplateRequest request);

	/** 把前端预览并勾选后的题目直接落进题库（不重新解析源文件） */
	void importQuestions(RepoQuestionImportRequest request);

	PaginationResponse<UserBookView> listUserBook(UserBookQuery query);

	/** 取错题本里某道题 */
	SurveySchema getUserBookQuestion(String id, Boolean withAnswer);

	void createUserBook(UserBookRequest request);

	/** 当前用户收藏的题目 id（去重） */
	List<String> listFavoriteTemplateIds();

	/** 切换收藏，返回切换后的状态：true=已收藏 */
	boolean toggleFavorite(UserBookRequest request);

	UserBookView updateUserBook(UserBookRequest request);

	void deleteUserBook(UserBookRequest request);

	List<RepoView> selectRepo(SelectRepoRequest request);

	/** 导出题库题目 */
	void exportRepoQuestions(RepoRequest request);

}
