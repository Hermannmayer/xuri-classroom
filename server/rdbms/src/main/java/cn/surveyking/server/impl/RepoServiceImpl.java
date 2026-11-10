package cn.surveyking.server.impl;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.core.constant.TagCategoryEnum;
import cn.surveyking.server.core.uitls.AnswerScoreEvaluator;
import cn.surveyking.server.core.uitls.RepoTemplateExcelParseHelper;
import cn.surveyking.server.core.uitls.RepoTemplateI18n;
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
import cn.surveyking.server.service.AnswerService;
import cn.surveyking.server.service.BaseService;
import cn.surveyking.server.service.ClassResourceService;
import cn.surveyking.server.service.RepoService;
import cn.surveyking.server.service.UserDeptScopeService;
import com.baomidou.mybatisplus.core.toolkit.CollectionUtils;
import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import javax.validation.ValidationException;
import java.util.*;
import java.util.stream.Collectors;
import java.util.Arrays;

import static cn.surveyking.server.impl.UserBookServiceImpl.BOOK_TYPE_WRONG;
import static com.baomidou.mybatisplus.core.toolkit.StringUtils.isNotBlank;

/**
 * @author javahuang
 * @date 2022/4/27
 */
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

	/** 题库分类（目录登记表，含空文件夹） */
	private final RepoCategoryMapper repoCategoryMapper;

	private final UserDeptScopeService userDeptScopeService;

	/** 按班级分配的题库存取：可见性与读权限都要认 t_class_resource 上的 repo 分配 */
	private final ClassResourceService classResourceService;

	/** 分类列表里表示「题库没填分类」的节点名 */
	private static final String UNCATEGORIZED_NAME = "未分类";

	/** 分类路径分隔符 */
	private static final String CATEGORY_PATH_SEPARATOR = "/";

	/**
	 * 「本班被分配了这个题库」的 EXISTS 条件（占位符 {0} = 当前用户 id）。
	 *
	 * <p>t_class_resource 有真实的 is_deleted 列，必须显式过滤；class_id 复用 DEPT_SCOPE_SQL
	 * （主组 + 附加组 + 祖先链），与题库授权弹窗、考试可见性同一份口径。
	 */
	private static final String CLASS_REPO_ASSIGN_SQL = "EXISTS (SELECT 1 FROM t_class_resource cr"
			+ " WHERE cr.resource_id = t_repo.id AND cr.resource_type = 'repo' AND cr.is_deleted = 0"
			+ " AND cr.class_id IN (" + UserDeptScopeService.DEPT_SCOPE_SQL + "))";

	/**
	 * 题库列表排序：只接受白名单字段，避免前端传任意列造成 SQL 注入式排序。
	 */
	private void applyRepoOrder(com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<Repo> wrapper,
			RepoQuery query) {
		boolean desc = Boolean.TRUE.equals(query.getSortDesc());
		String sortBy = query.getSortBy() == null ? "" : query.getSortBy();
		switch (sortBy) {
			case "name":
				// 名称按「拼音」排：直接 ORDER BY name 用的是列排序规则（UCA 字根笔画序），
				// 汉字顺序会看起来莫名其妙；转成 GBK 再排，GBK 的编码顺序基本等于拼音顺序。
				wrapper.last("ORDER BY CONVERT(name USING gbk) " + (desc ? "DESC" : "ASC"));
				break;
			case "category":
				// 分类同样是汉字，走 GBK 拼音序
				wrapper.last("ORDER BY CONVERT(COALESCE(category, '') USING gbk) " + (desc ? "DESC" : "ASC"));
				break;
			case "mode":
				// 类型是 exam / practice 这类英文枚举，直接排
				wrapper.last("ORDER BY mode " + (desc ? "DESC" : "ASC"));
				break;
			case "tag":
				// 标签是 varchar（逗号/JSON 串），按原串排；不做 GBK 转换，
				// 避免标签里出现 GBK 不支持的字符时直接 500
				wrapper.last("ORDER BY COALESCE(tag, '') " + (desc ? "DESC" : "ASC"));
				break;
			case "total":
				// 题量不是 t_repo 的列，是每行实时统计出来的，排序用子查询才能跨页正确
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
		// 管理员看全部题库；非管理员才按「自己创建 / 共享 / 被授权」收窄。
		// 之前管理员也被 createBy 限制，题库是别人建的就看不到。
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
			// 获取每个标签对应的题的数量
			repoView.setTemplateTags(this.getBaseMapper().selectRepoTemplateTags(repoView.getId()));
			// 获取每个问题类型对应的题的数量
			repoView.setRepoQuestionTypes(this.getBaseMapper().selectRepoQuestionTypes(repoView.getId()));
		});
		return result;
	}

	/**
	 * 题库可见性（listRepo 与 listRepoCategories 共用）。
	 *
	 * <p>管理员全量；非管理员按「自己创建 / 共享 / 逐个或按组授权 / 按班级分配」收窄。
	 * @param memberOnly 只算成员可见范围（学员的练习册入口用）
	 */
	private void applyRepoVisibility(
			com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<Repo> wrapper, String currentUserId,
			boolean memberOnly) {
		if (SecurityContextUtils.isAdmin()) {
			return;
		}
		wrapper.and(x -> {
			if (memberOnly) {
				// 自己创建的、共享的、逐个授权、或所在用户组被授权（主组 + 附加组，含祖先链）
				x.eq(Repo::getCreateBy, currentUserId).or().eq(Repo::getShared, true).or().apply(
						"EXISTS (SELECT 1 FROM t_repo_partner rp WHERE rp.repo_id = t_repo.id AND (rp.user_id = {0} OR (rp.dept_id IS NOT NULL AND rp.dept_id IN ("
								+ UserDeptScopeService.DEPT_SCOPE_SQL + "))))",
						currentUserId)
						// 按班级分配：本班在 t_class_resource 上有这个题库就可见（学员练习入口）
						.or().apply(CLASS_REPO_ASSIGN_SQL, currentUserId);
			}
			else {
				x.eq(Repo::getCreateBy, currentUserId).or(y -> y.eq(Repo::getShared, true))
						// 按班级分配：本班在 t_class_resource 上有这个题库就可见（学员练习入口）
						.or().apply(CLASS_REPO_ASSIGN_SQL, currentUserId);
			}
		});
	}

	/**
	 * 题库分类/文件夹列表：目录登记表 + t_repo 现有 category 的 distinct 值，扁平返回。
	 *
	 * <p>同一路径只出现一次；t_repo.category 写了多级（如 A/B）会自动补齐祖先节点（A）。
	 * count = 直接挂在该目录 + 所有子目录的**可见**题库数；返回顺序是「父在前、子紧跟」的前序，
	 * 同层按名称排序，前端可以直接顺序建树。
	 */
	@Override
	public List<RepoCategoryView> listRepoCategories() {
		String currentUserId = SecurityContextUtils.getUserId();
		// 1. 可见题库的分类（可见性与 listRepo 同源）
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

		// 2. 目录登记表（空文件夹只存在这里）
		Map<String, RepoCategory> registryByPath = new LinkedHashMap<>();
		for (RepoCategory category : repoCategoryMapper.selectList(Wrappers.<RepoCategory>lambdaQuery())) {
			if (category == null || !StringUtils.hasText(category.getPath())) {
				continue;
			}
			registryByPath.put(normalizeCategoryPath(category.getPath()), category);
		}

		// 3. 节点 = 登记表路径 ∪ 可见题库的分类路径，并逐层补齐祖先
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
		// 4. 登记表里的 id / name / parentId 覆盖回来（名称以登记表为准）
		registryByPath.forEach((path, category) -> {
			RepoCategoryView view = nodes.get(path);
			if (view == null) {
				return;
			}
			view.setId(category.getId());
			view.setName(category.getName());
			view.setParentId(category.getParentId());
		});

		// 5. count：从每个题库所在目录往上，累加到所有祖先
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

		// 6. 「未分类」：只有真的存在没填分类的题库时才出现
		Integer uncategorized = repoCounts.get("");
		if (uncategorized != null && uncategorized > 0) {
			RepoCategoryView view = new RepoCategoryView();
			view.setName(UNCATEGORIZED_NAME);
			view.setPath("");
			view.setCount(uncategorized);
			nodes.put("", view);
		}

		// 7. 前序展开：父节点在前、子节点紧跟；同层按名称排序
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
		// 上级：优先 parentId（登记表行），其次 parentPath（给还没登记、只有路径的层级用）
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
			// 并发建同一路径：唯一键兜底
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
		// MyBatis-Plus 的 updateById 会跳过 null 字段，「清空全局开放期」（前端传 null）会静默不生效。
		// 这两列显式 set 一次：题库编辑弹窗是整表单保存，总会带上这两个字段（不传=清空）。
		getBaseMapper().update(null, Wrappers.<Repo>lambdaUpdate().eq(Repo::getId, request.getId())
				.set(Repo::getOpenStartAt, request.getOpenStartAt()).set(Repo::getOpenEndAt, request.getOpenEndAt()));
		tagService.batchAddTag(request.getId(), TagCategoryEnum.repo, request.getTag());
	}

	@Override
	public void deleteRepo(RepoRequest request) {
		assertManageRepo(request.getId());
		String id = request.getId();
		removeById(id);
		// 题库没了，按班级的分配也要清掉，否则 t_class_resource 留下指向已删题库的孤儿行
		classResourceService.removeByResource(ClassResourceService.RESOURCE_TYPE_REPO, id);
		// 删除题库下面的所有题
		templateService.remove(Wrappers.<Template>lambdaUpdate().eq(Template::getRepoId, id));
		// 取消题库标签
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
			// 根据序号更新更新题库
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
			// template 里面的 tags 冗余了
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
			// 添加模板的时候，需要添加题库与模板的关联关系
			templatesAdd.forEach(x -> x.setRepoId(request.getRepoId()));
			templateService.batchAddTemplate(templatesAdd);
		}
		if (!templatesUpdate.isEmpty()) {
			templatesUpdate.forEach(x -> x.setRepoId(request.getRepoId()));
			templateService.batchUpdateTemplate(templatesUpdate);
			// 更新模板时需要删除之前的标签
			tagService.remove(Wrappers.<Tag>lambdaUpdate().in(Tag::getEntityId,
					templatesUpdate.stream().map(x -> x.getId()).collect(Collectors.toList())));
		}

		// 添加模板问题标签
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

	/**
	 * 从题库里面挑选题目
	 * @param repos
	 * @return
	 */
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
				// 随机从问题里面挑选指定数量的题
				Collections.shuffle(repoTemplates);
				if (repoTemplates.size() > repo.getQuestionsNum()) {
					repoTemplates = repoTemplates.subList(0, repo.getQuestionsNum());
				}
			}

			// 给问题添加分值
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
		// 相同类型的问题排放在一起
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
		request.setTemplates(parseExcelToTemplate(request.getFile()));
		batchAddRepoTemplate(request);
	}

	@SneakyThrows
	private List<TemplateRequest> parseExcelToTemplate(MultipartFile file) {
		return new RepoTemplateExcelParseHelper(file).parse();
	}

	@Override
	public PaginationResponse<UserBookView> listUserBook(UserBookQuery query) {
		Page<UserBook> page = userBookService.pageByQuery(query,
				Wrappers.<UserBook>lambdaQuery().like(query.getName() != null, UserBook::getName, query.getName())
						.eq(query.getType() != null, UserBook::getType, query.getType())
						.ge(query.getStartDate() != null, UserBook::getCreateAt, query.getStartDate())
						.le(query.getEndDate() != null, UserBook::getCreateAt, query.getEndDate())
						// 出错次数下限：错题本里「错过 2 次以上」这类筛选
						.ge(query.getWrongTimesMin() != null, UserBook::getWrongTimes, query.getWrongTimesMin())
						// 标记状态：1 已掌握 / 2 重点标记
						.eq(query.getStatus() != null, UserBook::getStatus, query.getStatus())
						// 来源考试：只看某一场考试产生的错题（不传则不限）
						.eq(isNotBlank(query.getProjectId()), UserBook::getProjectId, query.getProjectId())
						.eq(UserBook::getCreateBy, SecurityContextUtils.getUserId()));
		PaginationResponse<UserBookView> result = new PaginationResponse<>(page.getTotal(),
				userBookViewMapper.toView(page.getRecords()));
		return result;
	}

	@Override
	public SurveySchema getUserBookQuestion(String id, Boolean withAnswer) {
		UserBook userBook = userBookService.getOne(Wrappers.<UserBook>lambdaQuery().eq(UserBook::getId, id)
				.eq(UserBook::getCreateBy, SecurityContextUtils.getUserId()));
		if (userBook == null) {
			throw new AccessDeniedException("笔记不存在或无权查看");
		}
		Template template = templateService.getReadableTemplate(userBook.getTemplateId());
		SurveySchema schema = template.getTemplate().deepCopy();
		schema.setId(template.getId());
		// 默认剥掉答案：做题时不该看到正确答案。
		// 错题本练习的结果页需要判分，此时前端传 withAnswer=1；
		// 能取到的只有「本人错题本里的题」，不会因此泄漏整个题库。
		if (!Boolean.TRUE.equals(withAnswer)) {
			SchemaHelper.ignoreAttributes(schema, "examCorrectAnswer", "examScore", "examMatchRule", "examAnalysis");
		}
		return schema;
	}

	@Override
	public void createUserBook(UserBookRequest request) {
		UserBook userBook = userBookViewMapper.fromRequest(request);
		userBookService.save(userBook);
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
			// 模板问题分值默认是没有分数的，需要手动设置一个分数用于正确和错误运算
			template.getTemplate().getAttribute().setExamScore(5.0);
			template.getTemplate().setId(template.getId());
			AnswerScoreEvaluator answerScoreEvaluator = new AnswerScoreEvaluator(template.getTemplate(),
					request.getAnswer());
			Double qScore = answerScoreEvaluator.eval();
			UserInfo userInfo = SecurityContextUtils.getUser();
			// 回答正确
			// 连续做对几次，自动移出错题/0代表永不移出
			if (qScore > 0) {
				userBook.setCorrectTimes(Optional.ofNullable(userBook.getCorrectTimes()).orElse(0) + 1);
				// 正确几次之后会从错题本移除
				if (Optional.ofNullable(userInfo.getCorrectTimes()).orElse(0) >= userBook.getCorrectTimes()) {
					userBook.setWrongTimes(0);
				}
			}
			else {
				// 回答失败，只要做错一次就给正确次数置 0
				userBook.setWrongTimes(Optional.ofNullable(userBook.getWrongTimes()).orElse(0) + 1);
				userBook.setCorrectTimes(0);
			}

			result.setQscore(qScore);
			// 保存临时答案
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
			// 获取每个标签对应的题的数量
			repoView.setTemplateTags(this.getBaseMapper().selectRepoTemplateTags(repoView.getId()));
			// 获取每个问题类型对应的题的数量
			repoView.setRepoQuestionTypes(this.getBaseMapper().selectRepoQuestionTypes(repoView.getId()));
		});
		return result;
	}

	@Override
	@SneakyThrows
	public void exportRepoQuestions(RepoRequest request) {
		assertReadableRepo(request.getId());
		// 获取题库信息
		Repo repo = getById(request.getId());
		String fileName = (repo != null && repo.getName() != null ? repo.getName() : "题库") + ".xlsx";

		// 设置响应头
		ContextHelper.getCurrentHttpResponse()
				.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
		ContextHelper.getCurrentHttpResponse().setHeader("Content-Disposition",
				"attachment; filename=" + java.net.URLEncoder.encode(fileName, "UTF-8"));

		// 查询题库中的各种题型
		List<Template> questions = templateService
				.list(Wrappers.<Template>lambdaQuery().eq(Template::getRepoId, request.getId())
						.in(Template::getQuestionType,
								Arrays.asList(SurveySchema.QuestionType.Radio, SurveySchema.QuestionType.Checkbox,
										SurveySchema.QuestionType.Judge, SurveySchema.QuestionType.FillBlank,
										SurveySchema.QuestionType.Textarea))
						.orderByAsc(Template::getQuestionType, Template::getCreateAt));

		// 准备导出数据 - 按题型分组
		Map<SurveySchema.QuestionType, List<Template>> questionsByType = questions.stream()
				.collect(Collectors.groupingBy(Template::getQuestionType));

		// 先处理单选题
		List<List<Object>> radioRows = new ArrayList<>();
		List<Template> radioQuestions = questionsByType.getOrDefault(SurveySchema.QuestionType.Radio,
				new ArrayList<>());
		int radioIndex = 1;

		for (Template template : radioQuestions) {
			SurveySchema schema = template.getTemplate();
			List<Object> row = new ArrayList<>();

			// 序号
			row.add(radioIndex++);

			// 题干
			row.add(schema.getTitle());

			// 选项A-H (单选题处理)
			List<SurveySchema> options = schema.getChildren();
			String[] optionTexts = new String[8];
			String correctAnswer = "";
			Double examScore = schema.getAttribute() != null ? schema.getAttribute().getExamScore() : null;

			if (options != null) {
				for (int i = 0; i < Math.min(options.size(), 8); i++) {
					SurveySchema option = options.get(i);
					optionTexts[i] = option.getTitle();

					// 检查是否为正确答案（单选题只有一个正确答案）
					if (option.getAttribute() != null && option.getAttribute().getExamCorrectAnswer() != null) {
						correctAnswer = String.valueOf((char) ('A' + i));
					}
				}
			}

			// 添加选项A-H
			for (int i = 0; i < 8; i++) {
				row.add(optionTexts[i] != null ? optionTexts[i] : "");
			}

			// 解析
			String analysis = schema.getAttribute() != null ? schema.getAttribute().getExamAnalysis() : "";
			row.add(analysis != null ? analysis : "");

			// 分数
			row.add(examScore != null ? examScore : "");

			// 答案
			row.add(correctAnswer);

			// 标签
			String tags = "";
			if (template.getTag() != null && template.getTag().length > 0) {
				tags = String.join(",", template.getTag());
			}
			row.add(tags);

			radioRows.add(row);
		}

		// 处理多选题
		List<List<Object>> checkboxRows = new ArrayList<>();
		List<Template> checkboxQuestions = questionsByType.getOrDefault(SurveySchema.QuestionType.Checkbox,
				new ArrayList<>());
		int checkboxIndex = 1;

		for (Template template : checkboxQuestions) {
			SurveySchema schema = template.getTemplate();
			List<Object> row = new ArrayList<>();

			// 序号
			row.add(checkboxIndex++);

			// 题干
			row.add(schema.getTitle());

			// 选项A-H (多选题处理)
			List<SurveySchema> options = schema.getChildren();
			String[] optionTexts = new String[8];
			List<String> correctAnswers = new ArrayList<>();
			Double examScore = schema.getAttribute() != null ? schema.getAttribute().getExamScore() : null;

			if (options != null) {
				for (int i = 0; i < Math.min(options.size(), 8); i++) {
					SurveySchema option = options.get(i);
					optionTexts[i] = option.getTitle();

					// 检查是否为正确答案（多选题可能有多个正确答案）
					if (option.getAttribute() != null && option.getAttribute().getExamCorrectAnswer() != null) {
						correctAnswers.add(String.valueOf((char) ('A' + i)));
					}
				}
			}

			// 添加选项A-H
			for (int i = 0; i < 8; i++) {
				row.add(optionTexts[i] != null ? optionTexts[i] : "");
			}

			// 解析
			String analysis = schema.getAttribute() != null ? schema.getAttribute().getExamAnalysis() : "";
			row.add(analysis != null ? analysis : "");

			// 分数
			row.add(examScore != null ? examScore : "");

			// 答案（多选题用逗号分隔多个答案）
			row.add(String.join(",", correctAnswers));

			// 标签
			String tags = "";
			if (template.getTag() != null && template.getTag().length > 0) {
				tags = String.join(",", template.getTag());
			}
			row.add(tags);

			checkboxRows.add(row);
		}

		// 处理判断题
		List<List<Object>> judgeRows = new ArrayList<>();
		List<Template> judgeQuestions = questionsByType.getOrDefault(SurveySchema.QuestionType.Judge,
				new ArrayList<>());
		int judgeIndex = 1;

		for (Template template : judgeQuestions) {
			SurveySchema schema = template.getTemplate();
			List<Object> row = new ArrayList<>();

			// 序号
			row.add(judgeIndex++);

			// 题干
			row.add(schema.getTitle());

			// 选项A、选项B（判断题一般是正确/错误）
			List<SurveySchema> options = schema.getChildren();
			String optionA = "";
			String optionB = "";
			String correctAnswer = "";
			Double examScore = schema.getAttribute() != null ? schema.getAttribute().getExamScore() : null;

			if (options != null && options.size() >= 2) {
				optionA = options.get(0).getTitle();
				optionB = options.get(1).getTitle();

				// 检查正确答案
				if (options.get(0).getAttribute() != null
						&& options.get(0).getAttribute().getExamCorrectAnswer() != null) {
					correctAnswer = "A";
				}
				else if (options.get(1).getAttribute() != null
						&& options.get(1).getAttribute().getExamCorrectAnswer() != null) {
					correctAnswer = "B";
				}
			}

			row.add(optionA);
			row.add(optionB);

			// 解析
			String analysis = schema.getAttribute() != null ? schema.getAttribute().getExamAnalysis() : "";
			row.add(analysis != null ? analysis : "");

			// 分数
			row.add(examScore != null ? examScore : "");

			// 答案
			row.add(correctAnswer);

			// 标签
			String tags = "";
			if (template.getTag() != null && template.getTag().length > 0) {
				tags = String.join(" ", template.getTag());
			}
			row.add(tags);

			judgeRows.add(row);
		}

		// 处理填空题
		List<List<Object>> fillBlankRows = new ArrayList<>();
		List<Template> fillBlankQuestions = questionsByType.getOrDefault(SurveySchema.QuestionType.FillBlank,
				new ArrayList<>());
		int fillBlankIndex = 1;

		for (Template template : fillBlankQuestions) {
			SurveySchema schema = template.getTemplate();
			List<Object> row = new ArrayList<>();

			// 序号
			row.add(fillBlankIndex++);

			// 题干
			row.add(schema.getTitle());

			// 空1-空8
			List<SurveySchema> blanks = schema.getChildren();
			String[] blankAnswers = new String[8];
			Double examScore = schema.getAttribute() != null ? schema.getAttribute().getExamScore() : null;

			if (blanks != null) {
				for (int i = 0; i < Math.min(blanks.size(), 8); i++) {
					SurveySchema blank = blanks.get(i);
					if (blank.getAttribute() != null && blank.getAttribute().getExamCorrectAnswer() != null) {
						blankAnswers[i] = blank.getAttribute().getExamCorrectAnswer();
					}
				}
			}

			// 添加空1-空8
			for (int i = 0; i < 8; i++) {
				row.add(blankAnswers[i] != null ? blankAnswers[i] : "");
			}

			// 解析
			String analysis = schema.getAttribute() != null ? schema.getAttribute().getExamAnalysis() : "";
			row.add(analysis != null ? analysis : "");

			// 单空分数
			row.add(examScore != null ? examScore : "");

			// 标签
			String tags = "";
			if (template.getTag() != null && template.getTag().length > 0) {
				tags = String.join(" ", template.getTag());
			}
			row.add(tags);

			fillBlankRows.add(row);
		}

		// 处理简答题（Textarea）
		List<List<Object>> textareaRows = new ArrayList<>();
		List<Template> textareaQuestions = questionsByType.getOrDefault(SurveySchema.QuestionType.Textarea,
				new ArrayList<>());
		int textareaIndex = 1;

		for (Template template : textareaQuestions) {
			SurveySchema schema = template.getTemplate();
			List<Object> row = new ArrayList<>();

			// 序号
			row.add(textareaIndex++);

			// 题干
			row.add(schema.getTitle());

			// 答案（对于简答题，可能存储在第一个子元素中）
			String answer = "";
			if (schema.getChildren() != null && !schema.getChildren().isEmpty()) {
				SurveySchema firstChild = schema.getChildren().get(0);
				if (firstChild.getAttribute() != null && firstChild.getAttribute().getExamCorrectAnswer() != null) {
					answer = firstChild.getAttribute().getExamCorrectAnswer();
				}
			}
			row.add(answer);

			// 解析
			String analysis = schema.getAttribute() != null ? schema.getAttribute().getExamAnalysis() : "";
			row.add(analysis != null ? analysis : "");

			// 分数
			Double examScore = schema.getAttribute() != null ? schema.getAttribute().getExamScore() : null;
			row.add(examScore != null ? examScore : "");

			// 标签
			String tags = "";
			if (template.getTag() != null && template.getTag().length > 0) {
				tags = String.join(" ", template.getTag());
			}
			row.add(tags);

			textareaRows.add(row);
		}

		// 准备不同题型的列标题
		List<String> radioCheckboxHeaders = new ArrayList<>();
		radioCheckboxHeaders.add(RepoTemplateI18n.HeaderLabel.SERIAL_NO.displayLabel());
		radioCheckboxHeaders.add(RepoTemplateI18n.HeaderLabel.TITLE.displayLabel());
		for (String suffix : Arrays.asList("A", "B", "C", "D", "E", "F", "G", "H")) {
			radioCheckboxHeaders.add(RepoTemplateI18n.optionLabel(suffix));
		}
		radioCheckboxHeaders.add(RepoTemplateI18n.HeaderLabel.ANALYSIS.displayLabel());
		radioCheckboxHeaders.add(RepoTemplateI18n.HeaderLabel.SCORE.displayLabel());
		radioCheckboxHeaders.add(RepoTemplateI18n.HeaderLabel.ANSWER.displayLabel());
		radioCheckboxHeaders.add(RepoTemplateI18n.HeaderLabel.TAGS.displayLabel());

		List<String> judgeHeaders = new ArrayList<>();
		judgeHeaders.add(RepoTemplateI18n.HeaderLabel.SERIAL_NO.displayLabel());
		judgeHeaders.add(RepoTemplateI18n.HeaderLabel.TITLE.displayLabel());
		judgeHeaders.add(RepoTemplateI18n.optionLabel("A"));
		judgeHeaders.add(RepoTemplateI18n.optionLabel("B"));
		judgeHeaders.add(RepoTemplateI18n.HeaderLabel.ANALYSIS.displayLabel());
		judgeHeaders.add(RepoTemplateI18n.HeaderLabel.SCORE.displayLabel());
		judgeHeaders.add(RepoTemplateI18n.HeaderLabel.ANSWER.displayLabel());
		judgeHeaders.add(RepoTemplateI18n.HeaderLabel.TAGS.displayLabel());

		List<String> fillBlankHeaders = new ArrayList<>();
		fillBlankHeaders.add(RepoTemplateI18n.HeaderLabel.SERIAL_NO.displayLabel());
		fillBlankHeaders.add(RepoTemplateI18n.HeaderLabel.TITLE.displayLabel());
		for (String index : Arrays.asList("1", "2", "3", "4", "5", "6", "7", "8")) {
			fillBlankHeaders.add(RepoTemplateI18n.blankLabel(index));
		}
		fillBlankHeaders.add(RepoTemplateI18n.HeaderLabel.ANALYSIS.displayLabel());
		fillBlankHeaders.add(RepoTemplateI18n.HeaderLabel.SINGLE_BLANK_SCORE.displayLabel());
		fillBlankHeaders.add(RepoTemplateI18n.HeaderLabel.TAGS.displayLabel());

		List<String> textareaHeaders = Arrays.asList(RepoTemplateI18n.HeaderLabel.SERIAL_NO.displayLabel(),
				RepoTemplateI18n.HeaderLabel.TITLE.displayLabel(), RepoTemplateI18n.HeaderLabel.ANSWER.displayLabel(),
				RepoTemplateI18n.HeaderLabel.ANALYSIS.displayLabel(), RepoTemplateI18n.HeaderLabel.SCORE.displayLabel(),
				RepoTemplateI18n.HeaderLabel.TAGS.displayLabel());

		// 创建Excel工作簿，包含多个sheet
		try (java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream()) {
			org.dhatim.fastexcel.Workbook workbook = new org.dhatim.fastexcel.Workbook(baos,
					RepoTemplateI18n.workbookName(), "1.0");

			// 创建单选题sheet
			if (!radioRows.isEmpty()) {
				org.dhatim.fastexcel.Worksheet radioSheet = workbook
						.newWorksheet(RepoTemplateI18n.SheetType.SINGLE_CHOICE.displayName());
				radioSheet.fitToWidth((short) 10);
				radioSheet.setFitToPage(true);

				// 添加表头
				for (int i = 0; i < radioCheckboxHeaders.size(); i++) {
					radioSheet.value(0, i, radioCheckboxHeaders.get(i));
				}

				// 添加数据行
				for (int r = 0; r < radioRows.size(); r++) {
					List<Object> rowData = radioRows.get(r);
					for (int c = 0; c < rowData.size(); c++) {
						Object value = rowData.get(c);
						if (value instanceof Integer) {
							radioSheet.value(r + 1, c, (Number) value);
						}
						else if (value instanceof String) {
							radioSheet.value(r + 1, c, (String) value);
						}
						else if (value != null) {
							radioSheet.value(r + 1, c, value.toString());
						}
					}
				}
			}

			// 创建多选题sheet
			if (!checkboxRows.isEmpty()) {
				org.dhatim.fastexcel.Worksheet checkboxSheet = workbook
						.newWorksheet(RepoTemplateI18n.SheetType.MULTIPLE_CHOICE.displayName());
				checkboxSheet.fitToWidth((short) 10);
				checkboxSheet.setFitToPage(true);

				// 添加表头
				for (int i = 0; i < radioCheckboxHeaders.size(); i++) {
					checkboxSheet.value(0, i, radioCheckboxHeaders.get(i));
				}

				// 添加数据行
				for (int r = 0; r < checkboxRows.size(); r++) {
					List<Object> rowData = checkboxRows.get(r);
					for (int c = 0; c < rowData.size(); c++) {
						Object value = rowData.get(c);
						if (value instanceof Integer) {
							checkboxSheet.value(r + 1, c, (Number) value);
						}
						else if (value instanceof String) {
							checkboxSheet.value(r + 1, c, (String) value);
						}
						else if (value != null) {
							checkboxSheet.value(r + 1, c, value.toString());
						}
					}
				}
			}

			// 创建判断题sheet
			if (!judgeRows.isEmpty()) {
				org.dhatim.fastexcel.Worksheet judgeSheet = workbook
						.newWorksheet(RepoTemplateI18n.SheetType.TRUE_FALSE.displayName());
				judgeSheet.fitToWidth((short) 10);
				judgeSheet.setFitToPage(true);

				// 添加表头
				for (int i = 0; i < judgeHeaders.size(); i++) {
					judgeSheet.value(0, i, judgeHeaders.get(i));
				}

				// 添加数据行
				for (int r = 0; r < judgeRows.size(); r++) {
					List<Object> rowData = judgeRows.get(r);
					for (int c = 0; c < rowData.size(); c++) {
						Object value = rowData.get(c);
						if (value instanceof Integer) {
							judgeSheet.value(r + 1, c, (Number) value);
						}
						else if (value instanceof String) {
							judgeSheet.value(r + 1, c, (String) value);
						}
						else if (value != null) {
							judgeSheet.value(r + 1, c, value.toString());
						}
					}
				}
			}

			// 创建填空题sheet
			if (!fillBlankRows.isEmpty()) {
				org.dhatim.fastexcel.Worksheet fillBlankSheet = workbook
						.newWorksheet(RepoTemplateI18n.SheetType.FILL_BLANK.displayName());
				fillBlankSheet.fitToWidth((short) 10);
				fillBlankSheet.setFitToPage(true);

				// 添加表头
				for (int i = 0; i < fillBlankHeaders.size(); i++) {
					fillBlankSheet.value(0, i, fillBlankHeaders.get(i));
				}

				// 添加数据行
				for (int r = 0; r < fillBlankRows.size(); r++) {
					List<Object> rowData = fillBlankRows.get(r);
					for (int c = 0; c < rowData.size(); c++) {
						Object value = rowData.get(c);
						if (value instanceof Integer) {
							fillBlankSheet.value(r + 1, c, (Number) value);
						}
						else if (value instanceof String) {
							fillBlankSheet.value(r + 1, c, (String) value);
						}
						else if (value != null) {
							fillBlankSheet.value(r + 1, c, value.toString());
						}
					}
				}
			}

			// 创建简答题sheet
			if (!textareaRows.isEmpty()) {
				org.dhatim.fastexcel.Worksheet textareaSheet = workbook
						.newWorksheet(RepoTemplateI18n.SheetType.TEXTAREA.displayName());
				textareaSheet.fitToWidth((short) 10);
				textareaSheet.setFitToPage(true);

				// 添加表头
				for (int i = 0; i < textareaHeaders.size(); i++) {
					textareaSheet.value(0, i, textareaHeaders.get(i));
				}

				// 添加数据行
				for (int r = 0; r < textareaRows.size(); r++) {
					List<Object> rowData = textareaRows.get(r);
					for (int c = 0; c < rowData.size(); c++) {
						Object value = rowData.get(c);
						if (value instanceof Integer) {
							textareaSheet.value(r + 1, c, (Number) value);
						}
						else if (value instanceof String) {
							textareaSheet.value(r + 1, c, (String) value);
						}
						else if (value != null) {
							textareaSheet.value(r + 1, c, value.toString());
						}
					}
				}
			}

			workbook.finish();

			// 写入响应流
			ContextHelper.getCurrentHttpResponse().getOutputStream().write(baos.toByteArray());
		}
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
		// 管理员可以维护任何题库（含共享题库）；其他人只能管自己创建的
		if (SecurityContextUtils.isAdmin()) {
			return;
		}
		if (!Objects.equals(repo.getCreateBy(), SecurityContextUtils.getUserId())) {
			throw new AccessDeniedException("无权限管理该题库");
		}
	}

	private void assertReadableRepo(String repoId) {
		Repo repo = getRepoOrThrow(repoId);
		String userId = SecurityContextUtils.getUserId();
		// 管理员全放行；共享题库对所有能进题库列表的人可读（与 TemplateServiceImpl#isReadableRepo、
		// 列表的 shared 分支保持同一口径，否则列表能看到、点进去 403 空白）；
		// 其余人只能读自己创建的、被逐个授权的、或所在用户组被授权的。
		if (SecurityContextUtils.isAdmin() || Objects.equals(repo.getCreateBy(), userId)
				|| Boolean.TRUE.equals(repo.getShared())) {
			return;
		}
		// 按班级分配：学生被分配到本班的题库也要能打开（否则列表能看到、点进去 403；练习 /repo/pick 也走这里）。
		// 非学生一律 false，不会放宽教职工的口径。
		if (classResourceService.canStudentReadRepo(repoId)) {
			return;
		}
		// 可见组 = 主组 + 附加组 + 祖先链（一次解析，不在循环里查）
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
