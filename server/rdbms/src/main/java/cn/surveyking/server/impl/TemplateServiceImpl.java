package cn.surveyking.server.impl;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.core.constant.TagCategoryEnum;
import cn.surveyking.server.core.uitls.ContextHelper;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.*;
import cn.surveyking.server.domain.mapper.TemplateViewMapper;
import cn.surveyking.server.domain.model.Repo;
import cn.surveyking.server.domain.model.RepoPartner;
import cn.surveyking.server.domain.model.Tag;
import cn.surveyking.server.domain.model.Template;
import cn.surveyking.server.domain.model.UserBook;
import cn.surveyking.server.mapper.TemplateMapper;
import cn.surveyking.server.mapper.RepoMapper;
import cn.surveyking.server.mapper.RepoPartnerMapper;
import cn.surveyking.server.service.BaseService;
import cn.surveyking.server.service.TemplateService;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import javax.validation.ValidationException;
import java.util.*;
import java.util.stream.Collectors;

import static org.apache.commons.lang3.StringUtils.isNotEmpty;
import static org.springframework.util.StringUtils.hasText;

/**
 * @author javahuang
 * @date 2021/9/23
 */
@Service
@Transactional
@RequiredArgsConstructor
public class TemplateServiceImpl extends BaseService<TemplateMapper, Template> implements TemplateService {

	private final TemplateViewMapper templateViewMapper;

	private final RepoMapper repoMapper;

	private final RepoPartnerMapper repoPartnerMapper;

	@Resource
	@Lazy
	private UserBookServiceImpl userBookService;

	@Resource
	@Lazy
	private TagServiceImpl tagService;

	@Override
	public PaginationResponse<TemplateView> listTemplate(TemplateQuery query) {
		if (query.getRepoId() != null) {
			assertReadableRepo(query.getRepoId());
		}
		List<String> taggedTemplateIds = getTaggedTemplateIds(query.getTag());
		if (!query.getTag().isEmpty() && taggedTemplateIds.isEmpty()) {
			return new PaginationResponse<>(0L, Collections.emptyList());
		}
		Page<Template> templatePage = pageByQuery(query, Wrappers.<Template>lambdaQuery()
				.like(isNotEmpty(query.getName()), Template::getName, query.getName())
				.eq(query.getQuestionType() != null, Template::getQuestionType, query.getQuestionType())
				// 默认查询额是普通题型
				.ne(query.getQuestionType() == null, Template::getQuestionType, SurveySchema.QuestionType.Survey)
				.in(!query.getCategories().isEmpty(), Template::getCategory, query.getCategories())
				.eq(query.getRepoId() != null, Template::getRepoId, query.getRepoId())
				.eq(query.getMode() != null, Template::getMode, query.getMode())
				.in(!query.getTag().isEmpty(), Template::getId, taggedTemplateIds)
				.eq(query.getShared() != null, Template::getShared, query.getShared())
				.eq(query.getShared() != null && query.getShared() == 0, Template::getCreateBy,
						SecurityContextUtils.getUserId())
				.eq(query.getShared() == null && query.getRepoId() == null, Template::getCreateBy,
						SecurityContextUtils.getUserId())
				.orderByAsc(Template::getPriority));
		return new PaginationResponse<>(templatePage.getTotal(),
				templatePage.getRecords().stream().map(templateViewMapper::toView).collect(Collectors.toList()));
	}

	@Override
	public String addTemplate(TemplateRequest request) {
		if (request.getRepoId() != null) {
			assertManageRepo(request.getRepoId());
		}
		Template template = templateViewMapper.fromRequest(request);
		save(template);
		return template.getId();
	}

	@Override
	public void batchAddTemplate(List<TemplateRequest> templateRequests) {
		templateRequests.stream().map(TemplateRequest::getRepoId).filter(Objects::nonNull).distinct()
				.forEach(this::assertManageRepo);
		saveBatch(templateViewMapper.fromRequest(templateRequests));
	}

	@Override
	public void batchUpdateTemplate(List<TemplateRequest> templateRequests) {
		templateRequests.forEach(request -> assertTemplateUpdateAllowed(getById(request.getId()), request));
		updateBatchById(templateViewMapper.fromRequest(templateRequests));
	}

	@Override
	public void updateTemplate(TemplateRequest request) {
		assertTemplateUpdateAllowed(getById(request.getId()), request);
		updateById(templateViewMapper.fromRequest(request));
	}

	@Override
	public void deleteTemplate(TemplateRequest request) {
		List<String> templateIds = request.getIds() == null ? Collections.emptyList() : request.getIds().stream()
				.filter(hasTextId -> hasText(hasTextId)).distinct().collect(Collectors.toList());
		List<Template> templates = templateIds.isEmpty() ? Collections.emptyList() : listByIds(templateIds);
		if (templates.size() != templateIds.size()) {
			throw new AccessDeniedException("模板不存在或无权删除");
		}
		templates.forEach(this::assertManageTemplate);
		if (!templateIds.isEmpty()) {
			removeBatchByIds(templateIds);
		}
	}

	@Override
	public Map<String, List<TemplateView>> selectTemplate(SelectTemplateRequest request) {
		RepoServiceImpl repoService = ContextHelper.getBean(RepoServiceImpl.class);
		List<Repo> repos = repoService.list(Wrappers.<Repo>lambdaQuery().eq(Repo::getMode, request.getMode().name())
				.and(x -> x.eq(Repo::getShared, 1).or(y -> y.eq(Repo::getCreateBy, SecurityContextUtils.getUserId()))));
		Map<String, List<TemplateView>> result = new LinkedHashMap<>();
		repos.forEach(repo -> {
			List<TemplateView> templateViews = templateViewMapper
					.toView(list(Wrappers.<Template>lambdaQuery().eq(Template::getRepoId, repo.getId())));
			result.put(repo.getName(), templateViews);
		});
		return result;
	}

	public Set<String> listTemplateCategories(CategoryQuery query) {
		QueryWrapper<Template> queryWrapper = new QueryWrapper<>();
		queryWrapper.select("DISTINCT category");
		queryWrapper.like(hasText(query.getName()), "category", query.getName());
		queryWrapper.eq("shared", query.getShared());
		queryWrapper.eq(Objects.equals(query.getShared(), 0), "create_by", SecurityContextUtils.getUserId());
		queryWrapper.eq("question_type", query.getQuestionType());
		return list(queryWrapper).stream().filter(x -> x != null).map(x -> x.getCategory()).collect(Collectors.toSet());
	}

	@Override
	public Set<String> getTags(TagQuery query) {
		Set<String> tags = new HashSet<>();
		list(Wrappers.<Template>lambdaQuery().select(Template::getTag)
				.eq(Template::getQuestionType, SurveySchema.QuestionType.Survey)
				.eq(query.getShared() == 0, Template::getCreateBy, SecurityContextUtils.getUserId())
				.eq(Template::getShared, query.getShared())).forEach(x -> {
					if (x.getTag() != null) {
						tags.addAll(Arrays.asList(x.getTag()));
					}
				});
		return tags;
	}

	@Override
	public TemplateView getTemplate(TemplateQuery query) {
		Template template = this.getById(query.getId());
		assertReadableTemplate(template);
		TemplateView templateView = templateViewMapper.toView(template);
		SurveySchema schema = template.getTemplate();
		schema.setId(query.getId());

		List<UserBook> userBooks = userBookService.list(Wrappers.<UserBook>lambdaQuery()
				.eq(UserBook::getTemplateId, query.getId()).eq(UserBook::getCreateBy, SecurityContextUtils.getUserId())
				.orderByDesc(UserBook::getUpdateAt).orderByDesc(UserBook::getCreateAt));
		userBooks.stream().filter(x -> hasText(x.getNote())).findFirst()
				.ifPresent(x -> templateView.setNote(x.getNote()));
		userBooks.stream().filter(x -> Objects.equals(x.getType(), UserBookServiceImpl.BOOK_TYPE_WRONG)).findFirst()
				.ifPresent(x -> {
					templateView.setCorrectTimes(x.getCorrectTimes());
					templateView.setWrongTimes(x.getWrongTimes());
				});
		return templateView;
	}

	private void assertReadableTemplate(Template template) {
		if (template == null) {
			throw new ValidationException("模板不存在");
		}
		if (Objects.equals(template.getShared(), 1)
				|| Objects.equals(template.getCreateBy(), SecurityContextUtils.getUserId())
				|| (template.getRepoId() != null && isReadableRepo(template.getRepoId()))) {
			return;
		}
		throw new ValidationException("没有权限访问该模板");
	}

	Template getReadableTemplate(String templateId) {
		Template template = getById(templateId);
		assertReadableTemplate(template);
		return template;
	}

	private void assertManageTemplate(Template template) {
		if (template == null) {
			throw new AccessDeniedException("模板不存在或无权修改");
		}
		if (Objects.equals(template.getCreateBy(), SecurityContextUtils.getUserId())) {
			return;
		}
		if (template.getRepoId() != null) {
			assertManageRepo(template.getRepoId());
			return;
		}
		throw new AccessDeniedException("模板不存在或无权修改");
	}

	private void assertTemplateUpdateAllowed(Template template, TemplateRequest request) {
		assertManageTemplate(template);
		if (request.getRepoId() != null && !Objects.equals(request.getRepoId(), template.getRepoId())) {
			assertManageRepo(request.getRepoId());
		}
	}

	private void assertManageRepo(String repoId) {
		Repo repo = repoMapper.selectById(repoId);
		if (repo == null || !Objects.equals(repo.getCreateBy(), SecurityContextUtils.getUserId())) {
			throw new AccessDeniedException("无权管理该题库的模板");
		}
	}

	private void assertReadableRepo(String repoId) {
		if (!isReadableRepo(repoId)) {
			throw new AccessDeniedException("无权访问该题库的模板");
		}
	}

	private boolean isReadableRepo(String repoId) {
		Repo repo = repoMapper.selectById(repoId);
		String userId = SecurityContextUtils.getUserId();
		// 与 RepoServiceImpl#assertReadableRepo 保持一致：管理员 / 创建者 / 逐个授权 / 所在用户组（含父组）授权
		return repo != null && (SecurityContextUtils.isAdmin() || Objects.equals(repo.getCreateBy(), userId)
				|| Boolean.TRUE.equals(repo.getShared())
				|| repoPartnerMapper.selectCount(Wrappers.<RepoPartner>lambdaQuery().eq(RepoPartner::getRepoId, repoId)
						.and(w -> w.eq(RepoPartner::getUserId, userId).or().apply(
								"dept_id IS NOT NULL AND dept_id IN (SELECT id FROM (WITH RECURSIVE dept_anc AS (SELECT id, parent_id FROM t_dept WHERE id = (SELECT dept_id FROM t_user WHERE id = {0}) UNION ALL SELECT d.id, d.parent_id FROM t_dept d JOIN dept_anc a ON d.id = a.parent_id) SELECT id FROM dept_anc) anc)",
								userId))) > 0);
	}

	private List<String> getTaggedTemplateIds(List<String> tags) {
		if (tags.isEmpty()) {
			return Collections.emptyList();
		}
		return tagService
				.list(Wrappers.<Tag>lambdaQuery().select(Tag::getEntityId)
						.eq(Tag::getCategory, TagCategoryEnum.template.name()).in(Tag::getName, tags))
				.stream().map(Tag::getEntityId).collect(Collectors.toList());
	}

}
