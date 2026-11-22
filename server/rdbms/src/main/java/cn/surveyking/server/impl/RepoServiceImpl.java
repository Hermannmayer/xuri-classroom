package cn.surveyking.server.impl;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.constant.ProjectModeEnum;
import cn.surveyking.server.core.constant.TagCategoryEnum;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.importer.ExcelRowImages;
import cn.surveyking.server.core.importer.ImportKind;
import cn.surveyking.server.core.importer.ImportPreview;
import cn.surveyking.server.core.importer.QuestionImageUploader;
import cn.surveyking.server.core.importer.TextQuestionParser;
import cn.surveyking.server.core.importer.WordQuestionParser;
import cn.surveyking.server.core.uitls.AnswerScoreEvaluator;
import cn.surveyking.server.core.uitls.RepoTemplateExcelParseHelper;
import cn.surveyking.server.core.uitls.RichTextSanitizer;
import cn.surveyking.server.core.uitls.SchemaHelper;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.core.uitls.ContextHelper;
import cn.surveyking.server.core.uitls.ExcelExporter;
import cn.surveyking.server.domain.dto.*;
import cn.surveyking.server.domain.mapper.RepoViewMapper;
import cn.surveyking.server.domain.mapper.UserBookViewMapper;
import cn.surveyking.server.domain.model.*;
import cn.surveyking.server.mapper.RepoCategoryMapper;
import cn.surveyking.server.mapper.RepoMapper;
import cn.surveyking.server.mapper.RepoPartnerMapper;
import cn.surveyking.server.mapper.UserMapper;
import cn.surveyking.server.service.AnswerService;
import cn.surveyking.server.service.BaseService;
import cn.surveyking.server.service.ClassResourceService;
import cn.surveyking.server.service.FileService;
import cn.surveyking.server.service.ProjectService;
import cn.surveyking.server.service.RepoService;
import cn.surveyking.server.service.UserDeptScopeService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.CollectionUtils;
import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.ValidationException;
import java.util.*;
import java.util.stream.Collectors;
import java.util.Arrays;

import static cn.surveyking.server.impl.UserBookServiceImpl.BOOK_TYPE_WRONG;
import static com.baomidou.mybatisplus.core.toolkit.StringUtils.isNotBlank;





@Slf4j
@Transactional(rollbackFor = Exception.class)
@Service
@RequiredArgsConstructor
public class RepoServiceImpl extends BaseService<RepoMapper, Repo> implements RepoService {

	private final TemplateServiceImpl templateService;

	private final RepoViewMapper repoViewMapper;

	private final TagServiceImpl tagService;

	private final UserBookServiceImpl userBookService;

	private final UserBookViewMapper userBookViewMapper;

	private final AnswerServiceImpl answerService;

	private final RepoPartnerMapper repoPartnerMapper;


	private final RepoCategoryMapper repoCategoryMapper;

	private final UserDeptScopeService userDeptScopeService;


	private final ClassResourceService classResourceService;

	private final UserMapper userMapper;

	private final ProjectService projectService;

	@Autowired
	@Lazy
	private FileService fileService;


	private static final String UNCATEGORIZED_NAME = "未分类";


	private static final String CATEGORY_PATH_SEPARATOR = "/";

	private static final int MAX_IMPORT_QUESTIONS = 500;







	private static final String CLASS_REPO_ASSIGN_SQL = "EXISTS (SELECT 1 FROM t_class_resource cr"
			+ " WHERE cr.resource_id = t_repo.id AND cr.resource_type = 'repo' AND cr.is_deleted = 0"
			+ " AND cr.class_id IN (" + UserDeptScopeService.DEPT_SCOPE_SQL + "))";

	/** 题库列表排序：只接受白名单字段，避免前端传任意列造成 SQL 注入式排序 */
	private void applyRepoOrder(com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<Repo> wrapper,
			RepoQuery query) {
		boolean desc = Boolean.TRUE.equals(query.getSortDesc());
		String sortBy = query.getSortBy() == null ? "" : query.getSortBy();
		switch (sortBy) {
			case "name":


				wrapper.last("ORDER BY CONVERT(name USING gbk) " + (desc ? "DESC" : "ASC"));
				break;
			case "category":

				wrapper.last("ORDER BY CONVERT(COALESCE(category, '') USING gbk) " + (desc ? "DESC" : "ASC"));
				break;
			case "mode":

				wrapper.last("ORDER BY mode " + (desc ? "DESC" : "ASC"));
				break;
			case "tag":


				wrapper.last("ORDER BY COALESCE(tag, '') " + (desc ? "DESC" : "ASC"));
				break;
			case "total":

				wrapper.last("ORDER BY (SELECT COUNT(*) FROM t_template tt WHERE tt.repo_id = t_repo.id AND tt.is_deleted = 0) "
						+ (desc ? "DESC" : "ASC"));
				break;
			case "updateAt":
				wrapper.orderBy(true, !desc, Repo::getUpdateAt);
				break;
			default:
				wrapper.orderBy(true, !desc, Repo::getCreateAt);
				break;
		}
	}

	@Override
	public PaginationResponse<RepoView> listRepo(RepoQuery query) {
		String currentUserId = SecurityContextUtils.getUserId();
		com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<Repo> wrapper = Wrappers.<Repo>lambdaQuery()
				.like(isNotBlank(query.getName()), Repo::getName, query.getName())
				.eq(StringUtils.hasText(query.getCategory()), Repo::getCategory, query.getCategory());


		applyRepoVisibility(wrapper, currentUserId, Boolean.TRUE.equals(query.getMemberOnly()));
		wrapper.eq(query.getIsPractice() != null, Repo::getIsPractice, query.getIsPractice())
				.eq(query.getMode() != null, Repo::getMode, query.getMode());
		applyRepoOrder(wrapper, query);
		Page<Repo> page = pageByQuery(query, wrapper);
		PaginationResponse<RepoView> result = new PaginationResponse<>(page.getTotal(),
				repoViewMapper.toView(page.getRecords()));
		result.getList().forEach(repoView -> {
			repoView.setTotal(
					templateService.count(Wrappers.<Template>lambdaQuery().eq(Template::getRepoId, repoView.getId())));

			repoView.setTemplateTags(this.getBaseMapper().selectRepoTemplateTags(repoView.getId()));

			repoView.setRepoQuestionTypes(this.getBaseMapper().selectRepoQuestionTypes(repoView.getId()));
		});
		return result;
	}

	/** 题库可见性（listRepo 与 listRepoCategories 共用） */
	private void applyRepoVisibility(
			com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<Repo> wrapper, String currentUserId,
			boolean memberOnly) {
		if (SecurityContextUtils.isAdmin()) {
			return;
		}

		User current = userMapper.selectById(currentUserId);
		if (current != null && "student".equals(current.getUserType())) {
			wrapper.apply(CLASS_REPO_ASSIGN_SQL, currentUserId);
			return;
		}
		wrapper.and(x -> {
			if (memberOnly) {

				x.eq(Repo::getCreateBy, currentUserId).or().eq(Repo::getShared, true).or().apply(
						"EXISTS (SELECT 1 FROM t_repo_partner rp WHERE rp.repo_id = t_repo.id AND (rp.user_id = {0} OR (rp.dept_id IS NOT NULL AND rp.dept_id IN ("
								+ UserDeptScopeService.DEPT_SCOPE_SQL + "))))",
						currentUserId)

						.or().apply(CLASS_REPO_ASSIGN_SQL, currentUserId);
			}
			else {
				x.eq(Repo::getCreateBy, currentUserId).or(y -> y.eq(Repo::getShared, true))

						.or().apply(CLASS_REPO_ASSIGN_SQL, currentUserId);
			}
		});
	}

	/** 题库分类/文件夹列表：目录登记表 + t_repo 现有 category 的 distinct 值，扁平返回 */
	@Override
	public List<RepoCategoryView> listRepoCategories() {
		String currentUserId = SecurityContextUtils.getUserId();

		com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<Repo> repoWrapper = Wrappers
				.<Repo>lambdaQuery().select(Repo::getId, Repo::getCategory);
		applyRepoVisibility(repoWrapper, currentUserId, false);
		Map<String, Integer> repoCounts = new LinkedHashMap<>();
		for (Repo repo : list(repoWrapper)) {
			if (repo == null) {
				continue;
			}
			repoCounts.merge(normalizeCategoryPath(repo.getCategory()), 1, Integer::sum);
		}


		Map<String, RepoCategory> registryByPath = new LinkedHashMap<>();
		for (RepoCategory category : repoCategoryMapper.selectList(Wrappers.<RepoCategory>lambdaQuery())) {
			if (category == null || !StringUtils.hasText(category.getPath())) {
				continue;
			}
			registryByPath.put(normalizeCategoryPath(category.getPath()), category);
		}


		Set<String> paths = new LinkedHashSet<>(registryByPath.keySet());
		for (String path : repoCounts.keySet()) {
			if (StringUtils.hasText(path)) {
				paths.add(path);
			}
		}
		Map<String, RepoCategoryView> nodes = new LinkedHashMap<>();
		for (String path : paths) {
			String[] segments = path.split(CATEGORY_PATH_SEPARATOR);
			StringBuilder current = new StringBuilder();
			for (int i = 0; i < segments.length; i++) {
				if (i > 0) {
					current.append(CATEGORY_PATH_SEPARATOR);
				}
				current.append(segments[i]);
				String nodePath = current.toString();
				if (nodes.containsKey(nodePath)) {
					continue;
				}
				RepoCategoryView view = new RepoCategoryView();
				view.setName(segments[i]);
				view.setPath(nodePath);
				int index = nodePath.lastIndexOf(CATEGORY_PATH_SEPARATOR);
				view.setParentPath(index < 0 ? null : nodePath.substring(0, index));
				view.setCount(0);
				nodes.put(nodePath, view);
			}
		}

		registryByPath.forEach((path, category) -> {
			RepoCategoryView view = nodes.get(path);
			if (view == null) {
				return;
			}
			view.setId(category.getId());
			view.setName(category.getName());
			view.setParentId(category.getParentId());
		});


		repoCounts.forEach((path, count) -> {
			if (!StringUtils.hasText(path)) {
				return;
			}
			String cursor = path;
			while (StringUtils.hasText(cursor)) {
				RepoCategoryView view = nodes.get(cursor);
				if (view != null) {
					view.setCount((view.getCount() == null ? 0 : view.getCount()) + count);
				}
				int index = cursor.lastIndexOf(CATEGORY_PATH_SEPARATOR);
				cursor = index < 0 ? null : cursor.substring(0, index);
			}
		});


		Integer uncategorized = repoCounts.get("");
		if (uncategorized != null && uncategorized > 0) {
			RepoCategoryView view = new RepoCategoryView();
			view.setName(UNCATEGORIZED_NAME);
			view.setPath("");
			view.setCount(uncategorized);
			nodes.put("", view);
		}


		Map<String, List<RepoCategoryView>> children = new LinkedHashMap<>();
		List<RepoCategoryView> roots = new ArrayList<>();
		for (RepoCategoryView view : nodes.values()) {
			String parentPath = view.getParentPath();
			if (StringUtils.hasText(parentPath) && nodes.containsKey(parentPath)) {
				children.computeIfAbsent(parentPath, key -> new ArrayList<>()).add(view);
			}
			else {
				roots.add(view);
			}
		}
		Comparator<RepoCategoryView> byName = Comparator.comparing(RepoCategoryView::getName,
				Comparator.nullsLast(String::compareTo));
		roots.sort(byName);
		children.values().forEach(list -> list.sort(byName));
		List<RepoCategoryView> result = new ArrayList<>();
		LinkedList<RepoCategoryView> queue = new LinkedList<>(roots);
		while (!queue.isEmpty()) {
			RepoCategoryView view = queue.removeFirst();
			result.add(view);
			List<RepoCategoryView> sub = children.get(view.getPath());
			if (sub != null) {
				queue.addAll(0, sub);
			}
		}
		return result;
	}

	@Override
	public void createRepoCategory(RepoCategoryRequest request) {
		if (request == null || !StringUtils.hasText(request.getName())) {
			throw new ValidationException("分类名不能为空");
		}
		String name = request.getName().trim();
		if (name.contains(CATEGORY_PATH_SEPARATOR)) {
			throw new ValidationException("分类名不能包含 /");
		}

		RepoCategory parent = null;
		if (StringUtils.hasText(request.getParentId())) {
			parent = repoCategoryMapper.selectById(request.getParentId());
			if (parent == null) {
				throw new ValidationException("上级分类不存在，请刷新后重试");
			}
		}
		String parentPath = parent != null ? normalizeCategoryPath(parent.getPath())
				: normalizeCategoryPath(request.getParentPath());
		String path = StringUtils.hasText(parentPath) ? parentPath + CATEGORY_PATH_SEPARATOR + name : name;
		if (path.length() > 255) {
			throw new ValidationException("分类层级过深");
		}
		Long exists = repoCategoryMapper
				.selectCount(Wrappers.<RepoCategory>lambdaQuery().eq(RepoCategory::getPath, path));
		if (exists != null && exists > 0) {
			throw new ValidationException("分类已存在");
		}
		RepoCategory category = new RepoCategory();
		category.setName(name);
		category.setParentId(parent == null ? null : parent.getId());
		category.setPath(path);
		try {
			repoCategoryMapper.insert(category);
		}
		catch (DuplicateKeyException e) {

			throw new ValidationException("分类已存在");
		}
	}

	/** 分类路径规范化：trim、反斜杠当 /、去掉首尾与重复的 /（t_repo.category 是自由文本） */
	private String normalizeCategoryPath(String category) {
		if (category == null) {
			return "";
		}
		String path = category.trim().replace('\\', '/').replaceAll("/{2,}", CATEGORY_PATH_SEPARATOR);
		while (path.startsWith(CATEGORY_PATH_SEPARATOR)) {
			path = path.substring(1);
		}
		while (path.endsWith(CATEGORY_PATH_SEPARATOR)) {
			path = path.substring(0, path.length() - 1);
		}
		return path;
	}

	/** 题库统计：题量、题型/难度分布、练习概况 */
	public RepoReportView repoReport(String repoId) {


		assertReadableRepo(repoId);
		Repo repo = getById(repoId);
		if (repo == null) {
			throw new ValidationException("题库不存在或已被删除");
		}
		RepoReportView view = new RepoReportView();
		view.setRepoId(repoId);
		view.setRepoName(repo.getName());

		List<Template> templates = templateService.list(Wrappers.<Template>lambdaQuery().eq(Template::getRepoId, repoId));
		view.setTotal(templates.size());
		for (Template template : templates) {
			String type = template.getQuestionType() == null ? "未知" : template.getQuestionType().name();
			view.getByType().merge(type, 1, Integer::sum);
			String difficulty = StringUtils.hasText(template.getDifficulty()) ? template.getDifficulty() : "未标注";
			view.getByDifficulty().merge(difficulty, 1, Integer::sum);
		}

		List<Answer> answers = answerService.list(Wrappers.<Answer>lambdaQuery().eq(Answer::getRepoId, repoId)
				.isNotNull(Answer::getExamExerciseType));
		RepoReportView.Practice practice = view.getPractice();
		practice.setCount(answers.size());
		practice.setStudents((int) answers.stream().map(Answer::getCreateBy).filter(StringUtils::hasText).distinct().count());
		DoubleSummaryStatistics scoreStats = answers.stream().map(Answer::getExamScore).filter(Objects::nonNull)
				.mapToDouble(Double::doubleValue).summaryStatistics();
		practice.setAvgScore(scoreStats.getCount() == 0 ? null : scoreStats.getAverage());
		return view;
	}

	@Override
	public RepoView getRpo(String id) {
		assertReadableRepo(id);
		return repoViewMapper.toView(getById(id));
	}

	@Override
	public void addRepo(RepoRequest request) {
		request.setId(IdWorker.getIdStr());
		save(repoViewMapper.fromRequest(request));
		tagService.batchAddTag(request.getId(), TagCategoryEnum.repo, request.getTag());
	}

	@Override
	public void updateRepo(RepoRequest request) {
		assertManageRepo(request.getId());
		updateById(repoViewMapper.fromRequest(request));


		getBaseMapper().update(null, Wrappers.<Repo>lambdaUpdate().eq(Repo::getId, request.getId())
				.set(Repo::getOpenStartAt, request.getOpenStartAt()).set(Repo::getOpenEndAt, request.getOpenEndAt()));
		tagService.batchAddTag(request.getId(), TagCategoryEnum.repo, request.getTag());
	}

	@Override
	public void deleteRepo(RepoRequest request) {
		assertManageRepo(request.getId());
		String id = request.getId();
		fileService.deleteByOwner("repo", id);
		removeById(id);

		classResourceService.removeByResource(ClassResourceService.RESOURCE_TYPE_REPO, id);

		templateService.remove(Wrappers.<Template>lambdaUpdate().eq(Template::getRepoId, id));

		tagService.remove(Wrappers.<Tag>lambdaUpdate().eq(Tag::getEntityId, id));
	}

	@Override
	public void batchAddRepoTemplate(RepoTemplateRequest request) {
		assertManageRepo(request.getRepoId());
		List<Tag> tagList = new ArrayList<>();
		List<TemplateRequest> templatesAdd = new ArrayList<>();
		List<TemplateRequest> templatesUpdate = new ArrayList<>();
		List<Template> templateListOfCurrentRepo = templateService
				.list(Wrappers.<Template>lambdaQuery().eq(Template::getRepoId, request.getRepoId()));

		request.getTemplates().forEach(template -> {

			templateListOfCurrentRepo.stream()
					.filter(t -> StringUtils.hasText(t.getSerialNo()) && t.getSerialNo().equals(template.getSerialNo())
							&& t.getQuestionType() == template.getQuestionType())
					.findFirst().ifPresent(t -> {
						template.setId(t.getId());
					});

			if (template.getId() == null) {
				template.setId(IdWorker.getIdStr());
				templatesAdd.add(template);
			}
			else {
				templatesUpdate.add(template);
			}

			if (template.getTemplate().getTags() != null) {
				template.setTag(template.getTemplate().getTags().toArray(new String[0]));
			}

			List<String> tags = template.getTemplate().getTags();
			if (tags != null && tags.size() > 0) {
				tags.forEach(tagStr -> {
					Tag tag = new Tag();
					tag.setName(tagStr);
					tag.setEntityId(template.getId());
					tag.setCategory(TagCategoryEnum.template.name());
					tagList.add(tag);
				});
			}
			template.setQuestionType(template.getTemplate().getType());
		});

		assertTemplatesBelongToRepo(request.getRepoId(),
				templatesUpdate.stream().map(TemplateRequest::getId).collect(Collectors.toList()));

		if (!templatesAdd.isEmpty()) {

			templatesAdd.forEach(x -> x.setRepoId(request.getRepoId()));
			templateService.batchAddTemplate(templatesAdd);
		}
		if (!templatesUpdate.isEmpty()) {
			templatesUpdate.forEach(x -> x.setRepoId(request.getRepoId()));
			templateService.batchUpdateTemplate(templatesUpdate);

			tagService.remove(Wrappers.<Tag>lambdaUpdate().in(Tag::getEntityId,
					templatesUpdate.stream().map(x -> x.getId()).collect(Collectors.toList())));
		}


		if (!tagList.isEmpty()) {
			tagService.saveBatch(tagList);
		}
	}

	@Override
	public void batchUnBindTemplate(RepoTemplateRequest request) {
		assertManageRepo(request.getRepoId());
		List<String> templateIds = normalizeTemplateIds(request.getIds());
		if (!templateIds.isEmpty()) {
			assertTemplatesBelongToRepo(request.getRepoId(), templateIds);
			templateService.remove(Wrappers.<Template>lambdaQuery().eq(Template::getRepoId, request.getRepoId())
					.in(Template::getId, templateIds));
		}
	}

	/** 从题库里面挑选题目 */
	@Override
	public List<SurveySchema> pickQuestionFromRepo(List<ProjectSetting.RandomSurveyCondition> repos) {
		List<Template> templates = new ArrayList<>();
		repos.forEach(repo -> {
			assertReadableRepo(repo.getRepoId());
			List<String> taggedTemplateIds = getTaggedTemplateIds(repo.getTags());
			if (!CollectionUtils.isEmpty(repo.getTags()) && taggedTemplateIds.isEmpty()) {
				return;
			}
			List<Template> repoTemplates = templateService
					.list(Wrappers.<Template>lambdaQuery().eq(Template::getRepoId, repo.getRepoId())
							.in(!CollectionUtils.isEmpty(repo.getTypes()), Template::getQuestionType, repo.getTypes())
							.in(!CollectionUtils.isEmpty(repo.getTags()), Template::getId, taggedTemplateIds));
			if (repo.getQuestionsNum() != null) {

				Collections.shuffle(repoTemplates);
				if (repoTemplates.size() > repo.getQuestionsNum()) {
					repoTemplates = repoTemplates.subList(0, repo.getQuestionsNum());
				}
			}


			repoTemplates.forEach(template -> {
				if (templates.stream().filter(x -> x.getId().equals(template.getId())).findFirst().isPresent()) {
					return;
				}
				if (repo.getExamScore() != null) {
					if (template.getTemplate().getAttribute() == null) {
						template.getTemplate().setAttribute(new SurveySchema.Attribute());
					}
					template.getTemplate().getAttribute().setExamScore(repo.getExamScore());
				}
				templates.add(template);
			});
		});

		return templates.stream().map(x -> {
			SurveySchema schema = x.getTemplate();
			schema.setId(x.getId());
			return schema;
		}).sorted(Comparator.comparing(SurveySchema::getType)).collect(Collectors.toList());
	}

	@Override
	@SneakyThrows
	public void importFromTemplate(RepoTemplateRequest request) {
		assertManageRepo(request.getRepoId());
		ImportKind kind = ImportKind.from(request.getKind());
		if (ImportKind.text == kind || (request.getFile() == null && StringUtils.hasText(request.getText()))) {
			request.setTemplates(parseTextToTemplate(request.getText()));
		}
		else if (ImportKind.word == kind) {
			if (request.getFile() == null) {
				throw new ErrorCodeException(ErrorCode.FileParseError, "请上传 Word 文件");
			}
			request.setTemplates(parseWordToTemplate(request.getFile()));
		}
		else {
			if (request.getFile() == null) {
				throw new ErrorCodeException(ErrorCode.FileParseError, "请上传 Excel 文件");
			}
			request.setTemplates(parseExcelToTemplate(request.getFile()));
		}
		batchAddRepoTemplate(request);
	}

	@Override
	public void importQuestions(RepoQuestionImportRequest request) {
		if (request == null || !StringUtils.hasText(request.getRepoId())) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "请先选择题库");
		}
		assertManageRepo(request.getRepoId());
		List<SurveySchema> questions = request.getQuestions();
		if (questions == null || questions.isEmpty()) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "没有要导入的题目");
		}
		if (questions.size() > MAX_IMPORT_QUESTIONS) {
			throw new ErrorCodeException(ErrorCode.ValidationError,
					"一次最多导入 " + MAX_IMPORT_QUESTIONS + " 道题，请分批导入");
		}
		List<TemplateRequest> templates = new ArrayList<>();
		int serial = 0;
		for (SurveySchema schema : questions) {
			if (schema == null) {
				continue;
			}
			RichTextSanitizer.sanitizeSchema(schema);
			templates.add(TemplateRequest.builder().serialNo(String.valueOf(++serial))
					.mode(ProjectModeEnum.exam).name(SchemaHelper.trimHtmlTag(schema.getTitle()))
					.chapter(schema.getChapter()).difficulty(schema.getDifficulty()).template(schema).build());
		}
		if (templates.isEmpty()) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "没有要导入的题目");
		}
		RepoTemplateRequest repoTemplate = new RepoTemplateRequest();
		repoTemplate.setRepoId(request.getRepoId());
		repoTemplate.setTemplates(templates);
		batchAddRepoTemplate(repoTemplate);
	}

	/** Word 导入：题库只存题目本体，图片占位符去掉（题库题目不支持富题干） */
	private List<TemplateRequest> parseWordToTemplate(MultipartFile file) {
		ImportPreview preview = new WordQuestionParser(file).parse();
		List<TemplateRequest> templates = new ArrayList<>();
		int serial = 0;
		for (SurveySchema schema : preview.getFlat()) {
			if (schema.getTitle() != null) {
				schema.setTitle(schema.getTitle().replaceAll("\\s*\\[\\[IMG:\\d+\\]\\]", "").trim());
			}
			templates.add(TemplateRequest.builder().serialNo(String.valueOf(++serial))
					.mode(ProjectModeEnum.exam).name(schema.getTitle()).chapter(schema.getChapter())
					.difficulty(schema.getDifficulty()).template(schema).build());
		}
		if (templates.isEmpty()) {
			throw new ErrorCodeException(ErrorCode.FileParseError, "未识别到题目，请检查 Word 模板格式");
		}
		return templates;
	}

	/** 文本导入：把解析结果转成题库模板条目（序号从 1 递增，供增量更新） */
	private List<TemplateRequest> parseTextToTemplate(String text) {
		if (!StringUtils.hasText(text)) {
			throw new ErrorCodeException(ErrorCode.FileParseError, "请提供要导入的题目文本");
		}
		ImportPreview preview = new TextQuestionParser(text).parse();
		List<TemplateRequest> templates = new ArrayList<>();
		int serial = 0;
		for (SurveySchema schema : preview.getFlat()) {
			templates.add(TemplateRequest.builder().serialNo(String.valueOf(++serial))
					.mode(ProjectModeEnum.exam).name(schema.getTitle()).chapter(schema.getChapter())
					.difficulty(schema.getDifficulty()).template(schema).build());
		}
		if (templates.isEmpty()) {
			throw new ErrorCodeException(ErrorCode.FileParseError, "未识别到题目，请检查文本格式");
		}
		return templates;
	}

	@SneakyThrows
	private List<TemplateRequest> parseExcelToTemplate(MultipartFile file) {
		ExcelRowImages rowImages = readExcelImages(file);
		RepoTemplateExcelParseHelper helper = new RepoTemplateExcelParseHelper(file, rowImages);
		List<TemplateRequest> templates = helper.parse();
		attachExcelRowImages(rowImages, templates);
		for (RepoTemplateExcelParseHelper.ParseWarning warning : helper.getWarnings()) {
			log.warn("题库导入提示：{}", warning.getMessage());
		}
		return templates;
	}

	private ExcelRowImages readExcelImages(MultipartFile file) {
		try {
			ExcelRowImages rowImages = ExcelRowImages.read(file.getBytes());
			for (ExcelRowImages.Warning warning : rowImages.getWarnings()) {
				log.warn("题库导入提示：{}", warning.getMessage());
			}
			return rowImages;
		}
		catch (Exception e) {
			log.warn("题库导入：读取 Excel 内嵌图片失败，已按无图片导入：{}", e.getMessage());
			return ExcelRowImages.empty();
		}
	}

	/** 题库导入也吃 Excel 内嵌图片：按选项列挂到选项，其余按行挂到题干 */
	private void attachExcelRowImages(ExcelRowImages rowImages, List<TemplateRequest> templates) {
		int attached = QuestionImageUploader.attachRowImages(fileService, templates, rowImages);
		if (attached > 0) {
			log.info("题库导入：已把 {} 张 Excel 内嵌图片挂到选项/题干", attached);
		}
	}

	@Override
	public PaginationResponse<UserBookView> listUserBook(UserBookQuery query) {
		Page<UserBook> page = userBookService.pageByQuery(query,
				Wrappers.<UserBook>lambdaQuery().like(query.getName() != null, UserBook::getName, query.getName())
						.eq(query.getType() != null, UserBook::getType, query.getType())
						.ge(query.getStartDate() != null, UserBook::getCreateAt, query.getStartDate())
						.le(query.getEndDate() != null, UserBook::getCreateAt, query.getEndDate())

						.ge(query.getWrongTimesMin() != null, UserBook::getWrongTimes, query.getWrongTimesMin())

						.eq(query.getStatus() != null, UserBook::getStatus, query.getStatus())

						.eq(isNotBlank(query.getProjectId()), UserBook::getProjectId, query.getProjectId())
						.eq(UserBook::getCreateBy, SecurityContextUtils.getUserId()));
		List<UserBookView> views = userBookViewMapper.toView(page.getRecords());
		fillAvailability(views);
		return new PaginationResponse<>(page.getTotal(), views);
	}

	/** 给每条记录标出「这道题还能不能打开」 */
	private void fillAvailability(List<UserBookView> views) {
		if (CollectionUtils.isEmpty(views)) {
			return;
		}

		Map<String, String> reasonCache = new HashMap<>();
		for (UserBookView view : views) {
			String templateId = view.getTemplateId();
			String cacheKey = templateId == null ? "" : templateId;
			String reason = reasonCache.computeIfAbsent(cacheKey,
					key -> templateService.unreadableReason(key.isEmpty() ? null : key));
			view.setAvailable(reason == null);
			view.setUnavailableReason(reason);
		}
	}

	@Override
	public SurveySchema getUserBookQuestion(String id, Boolean withAnswer) {
		UserBook userBook = userBookService.getOne(Wrappers.<UserBook>lambdaQuery().eq(UserBook::getId, id)
				.eq(UserBook::getCreateBy, SecurityContextUtils.getUserId()));
		if (userBook == null) {
			throw new AccessDeniedException("笔记不存在或无权查看");
		}
		Template template;
		try {
			template = templateService.getReadableTemplate(userBook.getTemplateId());
		}
		catch (RuntimeException ex) {


			throw new ValidationException("这道题现在打不开：" + ex.getMessage()
					+ "。如果它是在试卷里临时编写的题目（没有进入题库），就不能单独练习。");
		}
		if (template.getTemplate() == null) {
			throw new ValidationException("这道题现在打不开：题库里的题目内容已丢失，请联系管理员。");
		}
		SurveySchema schema = template.getTemplate().deepCopy();
		schema.setId(template.getId());



		if (!Boolean.TRUE.equals(withAnswer)) {
			SchemaHelper.ignoreAttributes(schema, "examCorrectAnswer", "examScore", "examMatchRule", "examAnalysis");
		}
		return schema;
	}

	@Override
	public void createUserBook(UserBookRequest request) {
		UserBook userBook = userBookViewMapper.fromRequest(request);
		if (UserBookServiceImpl.BOOK_TYPE_FAVORITE.equals(request.getType())) {
			assertFavoriteAllowed(request.getProjectId());
			fillFavoriteMeta(userBook, request);
		}
		userBookService.save(userBook);
	}

	@Override
	public List<String> listFavoriteTemplateIds() {
		return userBookService
				.list(Wrappers.<UserBook>lambdaQuery().eq(UserBook::getCreateBy, SecurityContextUtils.getUserId())
						.eq(UserBook::getType, UserBookServiceImpl.BOOK_TYPE_FAVORITE).select(UserBook::getTemplateId))
				.stream().map(UserBook::getTemplateId).filter(StringUtils::hasText).distinct()
				.collect(Collectors.toList());
	}

	@Override
	public boolean toggleFavorite(UserBookRequest request) {
		if (!StringUtils.hasText(request.getTemplateId())) {
			throw new ValidationException("缺少题目 id");
		}
		assertFavoriteAllowed(request.getProjectId());
		String userId = SecurityContextUtils.getUserId();
		LambdaQueryWrapper<UserBook> query = Wrappers.<UserBook>lambdaQuery()
				.eq(UserBook::getTemplateId, request.getTemplateId())
				.eq(UserBook::getType, UserBookServiceImpl.BOOK_TYPE_FAVORITE).eq(UserBook::getCreateBy, userId);
		if (StringUtils.hasText(request.getProjectId())) {
			query.eq(UserBook::getProjectId, request.getProjectId());
		}
		else {
			query.isNull(UserBook::getProjectId);
		}
		UserBook existing = userBookService.getOne(query.last("LIMIT 1"));
		if (existing != null) {
			userBookService.removeById(existing.getId());
			return false;
		}
		UserBook favorite = new UserBook();
		favorite.setTemplateId(request.getTemplateId());
		favorite.setType(UserBookServiceImpl.BOOK_TYPE_FAVORITE);
		favorite.setProjectId(StringUtils.hasText(request.getProjectId()) ? request.getProjectId() : null);
		fillFavoriteMeta(favorite, request);
		userBookService.save(favorite);
		return true;
	}

	private void assertFavoriteAllowed(String projectId) {
		if (!StringUtils.hasText(projectId)) {
			return;
		}
		ProjectView project = projectService.getProject(projectId);
		if (project != null && project.getSetting() != null && project.getSetting().getExamSetting() != null
				&& Boolean.FALSE.equals(project.getSetting().getExamSetting().getFavoriteEnabled())) {
			throw new ValidationException("本场考试已禁止收藏题目");
		}
	}

	private void fillFavoriteMeta(UserBook userBook, UserBookRequest request) {
		String name = request.getName();
		String repoId = request.getRepoId();
		if (StringUtils.hasText(request.getTemplateId())) {




			Template template = templateService.getById(request.getTemplateId());
			if (template != null) {
				name = StringUtils.hasText(template.getName()) ? template.getName() : name;
				repoId = template.getRepoId();
			}
		}
		userBook.setName(StringUtils.hasText(name) ? name : "题目 " + request.getTemplateId());
		userBook.setRepoId(repoId);
	}

	@Override
	public UserBookView updateUserBook(UserBookRequest request) {
		UserBookView result = new UserBookView();
		UserBook userBook = userBookViewMapper.fromRequest(request);
		boolean noteProvided = request.getNote() != null;
		String normalizedNote = noteProvided ? request.getNote().trim() : null;
		userBook.setNote(normalizedNote);
		UserBook existingUserBook = null;
		if (userBook.getId() != null) {
			assertOwnedUserBook(userBook.getId());
			existingUserBook = userBookService.getById(userBook.getId());
		}
		else if (StringUtils.hasText(request.getTemplateId())) {
			List<UserBook> userBooks = userBookService
					.list(Wrappers.<UserBook>lambdaQuery().eq(UserBook::getTemplateId, request.getTemplateId())
							.eq(UserBook::getCreateBy, SecurityContextUtils.getUserId())
							.orderByDesc(UserBook::getUpdateAt).orderByDesc(UserBook::getCreateAt));
			existingUserBook = selectUserBookForUpdate(userBooks, request);
			if (existingUserBook != null) {
				userBook.setId(existingUserBook.getId());
			}
		}
		if (noteProvided && !StringUtils.hasText(normalizedNote) && request.getAnswer() == null) {
			clearUserBookNote(existingUserBook);
			return result;
		}
		if (request.getAnswer() != null) {
			Template template = templateService.getReadableTemplate(request.getTemplateId());
			userBook.setRepoId(template.getRepoId());
			userBook.setName(template.getName());
			userBook.setType(BOOK_TYPE_WRONG);

			template.getTemplate().getAttribute().setExamScore(5.0);
			template.getTemplate().setId(template.getId());
			AnswerScoreEvaluator answerScoreEvaluator = new AnswerScoreEvaluator(template.getTemplate(),
					request.getAnswer());
			Double qScore = answerScoreEvaluator.eval();
			UserInfo userInfo = SecurityContextUtils.getUser();


			if (qScore > 0) {
				userBook.setCorrectTimes(Optional.ofNullable(userBook.getCorrectTimes()).orElse(0) + 1);

				if (Optional.ofNullable(userInfo.getCorrectTimes()).orElse(0) >= userBook.getCorrectTimes()) {
					userBook.setWrongTimes(0);
				}
			}
			else {

				userBook.setWrongTimes(Optional.ofNullable(userBook.getWrongTimes()).orElse(0) + 1);
				userBook.setCorrectTimes(0);
			}

			result.setQscore(qScore);

			if (request.getAnswerId() != null) {
				Answer answer = answerService.getOne(Wrappers.<Answer>lambdaQuery()
						.select(Answer::getId, Answer::getRepoId, Answer::getTempAnswer, Answer::getExamInfo)
						.eq(Answer::getId, request.getAnswerId())
						.eq(Answer::getCreateBy, SecurityContextUtils.getUserId()));
				if (answer == null || !Objects.equals(answer.getRepoId(), template.getRepoId())) {
					throw new AccessDeniedException("无权修改该答卷的练习记录");
				}
				LinkedHashMap tempAnswer = Optional.ofNullable(answer.getTempAnswer()).orElse(new LinkedHashMap());
				tempAnswer.putAll(request.getAnswer());
				answer.setTempAnswer(tempAnswer);
				AnswerExamInfo examInfo = Optional.ofNullable(answer.getExamInfo()).orElse(new AnswerExamInfo());
				LinkedHashMap<String, Double> questionScore = Optional.ofNullable(examInfo.getQuestionScore())
						.orElse(new LinkedHashMap<>());
				examInfo.setQuestionScore(questionScore);
				questionScore.put(request.getTemplateId(), qScore);
				answer.setExamInfo(examInfo);
				answerService.updateById(answer);
			}
		}
		else if (noteProvided && existingUserBook == null) {
			Template template = templateService.getReadableTemplate(request.getTemplateId());
			userBook.setRepoId(template.getRepoId());
			userBook.setName(template.getName());
			userBook.setType(BOOK_TYPE_WRONG);
		}
		if (userBook.getId() != null) {
			userBookService.updateById(userBook);
		}
		else {
			userBookService.save(userBook);
		}

		return result;

	}

	private UserBook selectUserBookForUpdate(List<UserBook> userBooks, UserBookRequest request) {
		if (CollectionUtils.isEmpty(userBooks)) {
			return null;
		}
		if (request.getAnswer() != null) {
			return userBooks.stream().filter(x -> Objects.equals(x.getType(), BOOK_TYPE_WRONG)).findFirst()
					.orElse(null);
		}
		if (request.getNote() != null) {
			return userBooks.stream().filter(x -> StringUtils.hasText(x.getNote())).findFirst()
					.orElseGet(() -> userBooks.stream().filter(x -> Objects.equals(x.getType(), BOOK_TYPE_WRONG))
							.findFirst().orElse(userBooks.get(0)));
		}
		return null;
	}

	private void clearUserBookNote(UserBook userBook) {
		if (userBook == null) {
			return;
		}
		if (!Objects.equals(userBook.getType(), UserBookServiceImpl.BOOK_TYPE_FAVORITE)
				&& userBook.getWrongTimes() == null && userBook.getCorrectTimes() == null) {
			userBookService.remove(Wrappers.<UserBook>lambdaQuery().eq(UserBook::getId, userBook.getId())
					.eq(UserBook::getCreateBy, SecurityContextUtils.getUserId()));
			return;
		}
		userBookService.update(Wrappers.<UserBook>lambdaUpdate().eq(UserBook::getId, userBook.getId())
				.eq(UserBook::getCreateBy, SecurityContextUtils.getUserId()).set(UserBook::getNote, null));
	}

	@Override
	public void deleteUserBook(UserBookRequest request) {
		if (request.getId() != null) {
			userBookService.remove(Wrappers.<UserBook>lambdaQuery().eq(UserBook::getId, request.getId())
					.eq(UserBook::getCreateBy, SecurityContextUtils.getUserId()));
		}
		if (CollectionUtils.isNotEmpty(request.getIds())) {
			userBookService.remove(Wrappers.<UserBook>lambdaQuery().in(UserBook::getId, request.getIds())
					.eq(UserBook::getCreateBy, SecurityContextUtils.getUserId()));
		}
		if (request.getTemplateId() != null) {
			userBookService
					.remove(Wrappers.<UserBook>lambdaUpdate().eq(UserBook::getTemplateId, request.getTemplateId())
							.eq(UserBook::getCreateBy, SecurityContextUtils.getUserId()));
		}
	}

	private void assertOwnedUserBook(String userBookId) {
		if (userBookService.count(Wrappers.<UserBook>lambdaQuery().eq(UserBook::getId, userBookId)
				.eq(UserBook::getCreateBy, SecurityContextUtils.getUserId())) == 0) {
			throw new AccessDeniedException("无权修改该笔记");
		}
	}

	@Override
	public List<RepoView> selectRepo(SelectRepoRequest request) {
		List<RepoView> result = repoViewMapper
				.toView(list(Wrappers.<Repo>lambdaQuery().eq(Repo::getMode, request.getMode()).and(x -> x
						.eq(Repo::getCreateBy, SecurityContextUtils.getUserId()).or(y -> y.eq(Repo::getShared, 1)))));
		result.forEach(repoView -> {
			repoView.setTotal(
					templateService.count(Wrappers.<Template>lambdaQuery().eq(Template::getRepoId, repoView.getId())));

			repoView.setTemplateTags(this.getBaseMapper().selectRepoTemplateTags(repoView.getId()));

			repoView.setRepoQuestionTypes(this.getBaseMapper().selectRepoQuestionTypes(repoView.getId()));
		});
		return result;
	}

	@Override
	@SneakyThrows
	public void exportRepoQuestions(RepoRequest request) {

		byte[] content = exportRepoQuestionsBytes(request);
		Repo repo = getById(request.getId());
		String fileName = (repo != null && repo.getName() != null ? repo.getName() : "题库") + ".xlsx";
		HttpServletResponse response = ContextHelper.getCurrentHttpResponse();
		response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
		response.setHeader("Content-Disposition",
				"attachment; filename=" + java.net.URLEncoder.encode(fileName, "UTF-8"));
		response.getOutputStream().write(content);
	}

	/** 导出题库的全部题目为 xlsx 字节（只拼内容，不碰 HTTP 响应）；返回 xlsx 字节。 */
	byte[] exportRepoQuestionsBytes(RepoRequest request) {
		assertReadableRepo(request.getId());

		List<Template> questions = templateService.list(Wrappers.<Template>lambdaQuery()
				.eq(Template::getRepoId, request.getId())
				.in(Template::getQuestionType, RepoQuestionExcelExporter.EXPORTABLE_TYPES)
				.orderByAsc(Template::getQuestionType, Template::getCreateAt));
		if (CollectionUtils.isEmpty(questions)) {

			throw new ValidationException("题库里没有可导出的题目");
		}
		return RepoQuestionExcelExporter.export(questions);
	}

	private List<String> getTaggedTemplateIds(List<String> tags) {
		if (CollectionUtils.isEmpty(tags)) {
			return Collections.emptyList();
		}
		return tagService
				.list(Wrappers.<Tag>lambdaQuery().select(Tag::getEntityId)
						.eq(Tag::getCategory, TagCategoryEnum.template.name()).in(Tag::getName, tags))
				.stream().map(Tag::getEntityId).collect(Collectors.toList());
	}

	private void assertTemplatesBelongToRepo(String repoId, Collection<String> templateIds) {
		List<String> normalizedIds = normalizeTemplateIds(templateIds);
		if (normalizedIds.isEmpty()) {
			return;
		}
		long matchedCount = templateService.count(
				Wrappers.<Template>lambdaQuery().eq(Template::getRepoId, repoId).in(Template::getId, normalizedIds));
		if (matchedCount != normalizedIds.size()) {
			throw new AccessDeniedException("模板不存在或不属于当前题库");
		}
	}

	private List<String> normalizeTemplateIds(Collection<String> templateIds) {
		if (CollectionUtils.isEmpty(templateIds)) {
			return Collections.emptyList();
		}
		if (templateIds.stream().anyMatch(id -> !StringUtils.hasText(id))) {
			throw new AccessDeniedException("模板不存在或不属于当前题库");
		}
		return templateIds.stream().distinct().collect(Collectors.toList());
	}

	private void assertManageRepo(String repoId) {
		Repo repo = getRepoOrThrow(repoId);

		if (SecurityContextUtils.isAdmin()) {
			return;
		}
		String userId = SecurityContextUtils.getUserId();
		User current = userMapper.selectById(userId);
		if (current != null && "student".equals(current.getUserType())) {
			throw new AccessDeniedException("学员没有题库管理权限");
		}
		if (Objects.equals(repo.getCreateBy(), userId)) {
			return;
		}

		java.util.Set<String> deptScope = userDeptScopeService.resolveDeptScope(userId);
		boolean canEdit = repoPartnerMapper
				.selectList(Wrappers.<RepoPartner>lambdaQuery().eq(RepoPartner::getRepoId, repoId).and(w -> {
					w.eq(RepoPartner::getUserId, userId);
					if (!deptScope.isEmpty()) {
						w.or().isNotNull(RepoPartner::getDeptId).in(RepoPartner::getDeptId, deptScope);
					}
				}))
				.stream().anyMatch(partner -> (partner.getAccessLevel() == null ? 2 : partner.getAccessLevel()) >= 2);
		if (!canEdit) {
			throw new AccessDeniedException("无权限管理该题库");
		}
	}

	private void assertReadableRepo(String repoId) {
		Repo repo = getRepoOrThrow(repoId);
		String userId = SecurityContextUtils.getUserId();

		User current = userMapper.selectById(userId);
		if (current != null && "student".equals(current.getUserType())) {
			if (classResourceService.canStudentReadRepo(repoId)) {
				return;
			}
			throw new AccessDeniedException("无权限访问该题库");
		}



		if (SecurityContextUtils.isAdmin() || Objects.equals(repo.getCreateBy(), userId)
				|| Boolean.TRUE.equals(repo.getShared())) {
			return;
		}


		if (classResourceService.canStudentReadRepo(repoId)) {
			return;
		}

		Set<String> deptScope = userDeptScopeService.resolveDeptScope(userId);
		long authorized = repoPartnerMapper.selectCount(Wrappers.<RepoPartner>lambdaQuery()
				.eq(RepoPartner::getRepoId, repoId).and(w -> {
					w.eq(RepoPartner::getUserId, userId);
					if (!deptScope.isEmpty()) {
						w.or(q -> q.isNotNull(RepoPartner::getDeptId).in(RepoPartner::getDeptId, deptScope));
					}
				}));
		if (authorized > 0) {
			return;
		}
		throw new AccessDeniedException("无权限访问该题库");
	}

	private Repo getRepoOrThrow(String repoId) {
		Repo repo = getById(repoId);
		if (repo == null) {
			throw new AccessDeniedException("无权限访问该题库");
		}
		return repo;
	}

}
