package cn.surveyking.server.impl;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.*;
import cn.surveyking.server.domain.mapper.AnswerViewMapper;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.domain.model.AnswerItem;
import cn.surveyking.server.domain.model.Project;
import cn.surveyking.server.mapper.AnswerItemMapper;
import cn.surveyking.server.mapper.AnswerMapper;
import cn.surveyking.server.mapper.ProjectMapper;
import cn.surveyking.server.service.AnswerService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.stream.Collectors;

/**
 * @author javahuang
 * @date 2021/8/3
 */
@Service
@Transactional(rollbackFor = Exception.class)
@RequiredArgsConstructor
@Slf4j
public class AnswerServiceImpl extends ServiceImpl<AnswerMapper, Answer> implements AnswerService {

	private final ProjectMapper projectMapper;

	private final AnswerViewMapper answerViewMapper;

	private final AnswerAccessGuard answerAccessGuard;

	private final AnswerItemProjector answerItemProjector;

	private final AnswerItemMapper answerItemMapper;

	private final AnswerItemAnswerRebuilder answerItemAnswerRebuilder;

	private final AnswerSchemaDecorator answerSchemaDecorator;

	private final AnswerExporter answerExporter;

	private final AnswerSubmitIdempotency answerSubmitIdempotency;

	private final AnswerUploadParser answerUploadParser;

	private final AnswerScoringService answerScoringService;

	private final AnswerMetaEnricher answerMetaEnricher;

	private final ExerciseAnswerService exerciseAnswerService;

	private final AnswerAttemptAllocator answerAttemptAllocator;

	@Override
	public PaginationResponse<AnswerView> listAnswer(AnswerQuery query) {
		return listAnswer(query, true);
	}

	@Override
	public List<AnswerView> listByProjectAndLikeConditions(String projectId, List<String> likeValues) {
		if (projectId == null || likeValues == null || likeValues.isEmpty()) {
			return Collections.emptyList();
		}
		List<Answer> answers = list(Wrappers.<Answer>lambdaQuery().eq(Answer::getProjectId, projectId)
				.and(wrapper -> {
					for (String likeValue : likeValues) {
						wrapper.like(Answer::getAnswer, likeValue);
					}
				}));
		return answerViewMapper.toView(answers);
	}

	@Override
	public List<AnswerView> listAnswersForStat(String projectId) {
		List<Answer> answers = list(Wrappers.<Answer>lambdaQuery()
				.select(Answer::getId, Answer::getProjectId, Answer::getAnswer, Answer::getMetaInfo,
						Answer::getExamScore, Answer::getExamInfo, Answer::getTempSave, Answer::getExamExerciseType,
						Answer::getCreateBy, Answer::getCreateAt, Answer::getUpdateAt)
				.eq(Answer::getProjectId, projectId).isNotNull(Answer::getAnswer));
		return answerViewMapper.toView(answers);
	}

	private PaginationResponse<AnswerView> listAnswer(AnswerQuery query, boolean withSnapshot) {
		return listAnswer(query, withSnapshot, true);
	}

	/**
	 * @param withSnapshot 是否读取整卷快照（统计路径为 false）
	 * @param withAnswer 是否读取 {@code t_answer.answer} 原文（导出走投影时为 false）
	 */
	private PaginationResponse<AnswerView> listAnswer(AnswerQuery query, boolean withSnapshot, boolean withAnswer) {
		Page<Answer> page = new Page<>(query.getCurrent(), query.getPageSize());
		// 数据范围：管理员 / 项目所有者或协作者（含组授权）看全部；其他人（学员）只能看自己的答卷。
		// 之前只靠 @PreAuthorize('answer:list')，学员知道 projectId 就能列出全班答卷。
		boolean canSeeAll = answerAccessGuard.canManageProject(query.getProjectId());
		String currentUserId = SecurityContextUtils.getUserId();
		com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<Answer> wrapper = Wrappers
				.<Answer>lambdaQuery().isNotNull(Answer::getAnswer) // 暂存题答案会为空
				.eq(query.getProjectId() != null, Answer::getProjectId, query.getProjectId())
				.in(query.getIds() != null && query.getIds().size() > 0, Answer::getId, query.getIds())
				.lt(query.getEndTime() != null, Answer::getCreateAt, query.getEndTime())
				.gt(query.getStartTime() != null, Answer::getCreateAt, query.getStartTime())
				.eq(query.getId() != null, Answer::getId, query.getId())
				.eq(!canSeeAll, Answer::getCreateBy, currentUserId)
				.orderByDesc(Answer::getCreateAt);
		if (!withSnapshot) {
			// 统计路径：只取统计与权限判定需要的列，整卷快照与暂存答案一律不读。
			wrapper.select(Answer::getId, Answer::getProjectId, Answer::getAnswer, Answer::getMetaInfo,
					Answer::getExamScore, Answer::getExamInfo, Answer::getTempSave, Answer::getExamExerciseType,
					Answer::getCreateBy, Answer::getCreateAt, Answer::getUpdateAt);
		}
		else if (!withAnswer) {
			// S2-4 导出读投影：answer / survey / temp_answer 三个大字段都不读，答案由 t_answer_item 重建。
			wrapper.select(Answer::getId, Answer::getProjectId, Answer::getRepoId, Answer::getMetaInfo,
					Answer::getExamScore, Answer::getExamInfo, Answer::getTempSave, Answer::getExamExerciseType,
					Answer::getCreateBy, Answer::getCreateAt, Answer::getUpdateAt);
		}
		super.page(page, wrapper);
		List<AnswerView> list = answerViewMapper.toView(page.getRecords());
		Project project = projectMapper.selectById(query.getProjectId());
		FlatSurveySchemaByType schemaByType = answerSchemaDecorator.parseSurveySchemaByType(project.getSurvey());
		list.forEach(view -> answerSchemaDecorator.setAnswerExtraInfo(view, schemaByType));
		return new PaginationResponse<>(page.getTotal(), list);
	}

	@Override
	public AnswerView getAnswer(AnswerQuery query) {
		AnswerView answerView = null;
		if (query.getId() != null) {
			Answer answer = getById(query.getId());
			// 按 id 读单份答卷也要做数据范围校验：本人 / 管理员 / 项目所有者或协作者
			answerAccessGuard.assertAnswerAccess(answer);
			answerView = answerViewMapper.toView(answer);
		}
		else if (query.getProjectId() != null && Boolean.TRUE.equals(query.getLatest())) {
			answerView = answerViewMapper.toView(list(Wrappers.<Answer>lambdaQuery()
					.eq(Answer::getProjectId, query.getProjectId())
					.eq(SecurityContextUtils.isAuthenticated(), Answer::getCreateBy, SecurityContextUtils.getUserId())
					.eq(query.getCreateBy() != null, Answer::getCreateBy, query.getCreateBy())
					.orderByDesc(Answer::getCreateAt)).stream().findFirst().orElse(null));
		}
		if (answerView == null) {
			return null;
		}
		// 获取考试排名信息
		if (query.isRankEnabled()) {
			List<Double> scores = list(Wrappers.<Answer>lambdaQuery().select(Answer::getExamScore, Answer::getId)
					.eq(Answer::getProjectId, answerView.getProjectId())).stream()
							.map(x -> Optional.ofNullable(x.getExamScore()).orElse(Double.valueOf(0)))
							.collect(Collectors.toList());
			Collections.sort(scores, Collections.reverseOrder());
			answerView.setRank(scores.indexOf(answerView.getExamScore()) + 1);
		}
		String projectId = answerView.getProjectId();
		Project project = projectMapper.selectById(projectId);
		if (project == null || project.getSurvey() == null) {
			// 随机问题问卷没有 schema
			return answerView;
		}
		FlatSurveySchemaByType schemaByType = answerSchemaDecorator.parseSurveySchemaByType(project.getSurvey());
		answerSchemaDecorator.setAnswerExtraInfo(answerView, schemaByType);
		return answerView;
	}

	@Override
	public AnswerView getAnswerWithPermission(AnswerQuery query) {
		if (query.getId() != null) {
			answerAccessGuard.assertAnswerAccess(getById(query.getId()));
		}
		else if (query.getProjectId() != null && Boolean.TRUE.equals(query.getLatest())) {
			answerAccessGuard.assertProjectAccess(query.getProjectId());
		}
		return getAnswer(query);
	}

	@Override
	public AnswerView saveAnswer(AnswerRequest request) {
		// 公开查询修改答案时不会传元数据
		if (request.getMetaInfo() != null) {
			request.getMetaInfo().setClientInfo(parseClientInfo(request.getMetaInfo().getClientInfo()));
		}
		if (request.getTempSave() == null) {
			request.setTempSave(1);
		}
		if (StringUtils.hasText(request.getId())) {
			return updateAnswer(request);
		}
		// 新建答卷：先过一层应用级幂等，双击/网络重试不会再产生两条记录
		String idempotencyKey = answerSubmitIdempotency.buildSubmitIdempotencyKey(request);
		if (idempotencyKey == null) {
			return createAnswer(request);
		}
		Object lock = answerSubmitIdempotency.lockFor(idempotencyKey);
		synchronized (lock) {
			try {
				AnswerView replayed = answerSubmitIdempotency.replayRecentSubmit(idempotencyKey);
				if (replayed != null) {
					return replayed;
				}
				AnswerView created = createAnswer(request);
				answerSubmitIdempotency.rememberSubmit(idempotencyKey, created);
				return created;
			}
			finally {
				answerSubmitIdempotency.releaseLock(idempotencyKey, lock);
			}
		}
	}

	private AnswerView createAnswer(AnswerRequest request) {
		Answer answer = answerViewMapper.fromRequest(request);
		// 使用 uuid 作为外部公开查询引用，防暴力破解
		answer.setId(UUID.randomUUID().toString());
		answer.setCreateAt(new Date());
		// 新前端不再上传 metaInfo，「每 IP / 每台设备限次」会永远统计为 0：
		// 这里在服务端补齐真实 IP 与限次 cookie 标识。
		answer.setMetaInfo(answerMetaEnricher.enrichMetaInfo(answer.getMetaInfo()));
		// S1-3：先确定答题人再分配作答序号。createBy 由 MetaObjectHandler 兜底填当前登录用户，
		// 这里提前算出来，保证 attempt_no 和最终写进库的 create_by 是同一个值。
		String actor = StringUtils.hasText(answer.getCreateBy()) ? answer.getCreateBy()
				: SecurityContextUtils.getUserId();
		answer.setCreateBy(actor);
		answer.setAttemptNo(answerAttemptAllocator.next(answer.getProjectId(), actor));
		Answer scored = answerScoringService.beforeSaveAnswer(answer, previousAnswerFor(answer));
		try {
			save(scored);
		}
		catch (DuplicateKeyException duplicate) {
			// 多实例并发提交：唯一键 (project_id, create_by, attempt_no) 裁决，另一条已经落库就回读它。
			// 这样重复提交只会产生一条答卷，而不是把 500 抛给前端。
			Answer winner = findAttempt(scored);
			if (winner != null) {
				log.info("交卷幂等命中数据库唯一键，回读已有答卷: answerId={}", winner.getId());
				return answerViewMapper.toView(winner);
			}
			throw duplicate;
		}
		rebuildAnswerItems(scored);
		return answerViewMapper.toView(scored);
	}

	/** 唯一键冲突后按 (project_id, create_by, attempt_no) 找回赢家 */
	private Answer findAttempt(Answer answer) {
		return getOne(Wrappers.<Answer>lambdaQuery().eq(Answer::getProjectId, answer.getProjectId())
				.eq(answer.getCreateBy() != null, Answer::getCreateBy, answer.getCreateBy())
				.isNull(answer.getCreateBy() == null, Answer::getCreateBy)
				.eq(Answer::getAttemptNo, answer.getAttemptNo()).last("limit 1"), false);
	}

	/** 投影写失败不应该让交卷失败：统计侧有「覆盖数不足就回退内存算法」的兜底 */
	private void rebuildAnswerItems(Answer answer) {
		try {
			answerItemProjector.rebuild(answer);
		}
		catch (Exception e) {
			log.warn("重建答卷明细失败（不影响交卷，统计会回退内存算法）: answerId={}", answer == null ? null : answer.getId(), e);
		}
	}

	/** 库里已存的答卷（更新时存在、新建时为空），交给评分组件做计时与判分基准 */
	private Answer previousAnswerFor(Answer answer) {
		return StringUtils.hasText(answer.getId()) ? getById(answer.getId()) : null;
	}

	@Override
	public long count(AnswerQuery query) {
		return count(Wrappers.<Answer>lambdaQuery().eq(Answer::getProjectId, query.getProjectId())
				.ge(query.getStartTime() != null, Answer::getCreateAt, query.getStartTime())
				.lt(query.getEndTime() != null, Answer::getCreateAt, query.getEndTime())
				.eq(query.getCreateBy() != null, Answer::getCreateBy, query.getCreateBy())
				.like(query.getIp() != null, Answer::getMetaInfo, query.getIp())
				.like(query.getValueQuery() != null, Answer::getAnswer, query.getValueQuery())
				.like(query.getCookie() != null, Answer::getMetaInfo, query.getCookie()));
	}

	@Override
	public AnswerView updateAnswer(AnswerRequest request) {
		Answer answer = answerViewMapper.fromRequest(request);
		answer = answerScoringService.beforeSaveAnswer(answer, previousAnswerFor(answer));
		updateById(answer);
		rebuildAnswerItems(answer);
		return answerViewMapper.toView(answer);
	}

	@Override
	public AnswerView updateAnswerWithPermission(AnswerRequest request) {
		if (StringUtils.hasText(request.getId())) {
			Answer answer = getById(request.getId());
			answerAccessGuard.assertAnswerAccess(answer);
			// 后台编辑只能更新原问卷下的答案，避免通过请求参数迁移到其他问卷
			request.setProjectId(answer.getProjectId());
		}
		else {
			answerAccessGuard.assertProjectAccess(request.getProjectId());
		}
		return updateAnswer(request);
	}

	@Override
	public void deleteAnswer(AnswerRequest request) {
		answerAccessGuard.assertAnswersAccess(request.getIds());
		super.removeByIds(request.getIds());
	}

	@Override
	public DownloadData downloadSurvey(DownloadQuery query) {
		Project project = projectMapper.selectById(query.getProjectId());

		AnswerQuery answerQuery = new AnswerQuery();
		answerQuery.setProjectId(query.getProjectId());
		answerQuery.setIds(query.getIds());
		answerQuery.setStartTime(query.getStartTime());
		answerQuery.setEndTime(query.getEndTime());
		if (query.getPageSize() != 0) {
			answerQuery.setCurrent(query.getCurrent());
			answerQuery.setPageSize(query.getPageSize());
		}
		else {
			answerQuery.setPageSize(Integer.MAX_VALUE);
		}
		// S2-4：投影覆盖全部答卷时只读投影（瘦查询 + 重建 answer）；否则回退真源 JSON，
		// 保证「回填前 / 回填中 / 回填后」导出的列与内容完全一致。
		boolean projectionReady = projectionCoversAnswers(query.getProjectId());
		List<AnswerView> answerViews = listAnswer(answerQuery, true, !projectionReady).getList();
		if (projectionReady) {
			fillAnswersFromProjection(answerViews);
		}
		return answerExporter.downloadSurvey(project, answerViews);
	}

	/**
	 * 下载附件要使用 InputStreamResource，避免 Byte... 加载到内存
	 * @param query
	 * @return
	 */
	@Override
	public DownloadData downloadAttachment(DownloadQuery query) {
		Project project = projectMapper.selectById(query.getProjectId());
		AnswerQuery answerQuery = new AnswerQuery();
		answerQuery.setIds(query.getIds());
		answerQuery.setProjectId(query.getProjectId());
		answerQuery.setStartTime(query.getStartTime());
		answerQuery.setEndTime(query.getEndTime());
		if (query.getCurrent() != 0 && query.getPageSize() != 0) {
			answerQuery.setCurrent(query.getCurrent());
			answerQuery.setPageSize(query.getPageSize());
		}
		else {
			answerQuery.setPageSize(Integer.MAX_VALUE);
		}
		// 下载某个问卷答案的附件
		if (query.getAnswerId() != null) {
			answerQuery.setId(query.getAnswerId());
			return answerExporter.generateSurveyAttachment(project, listAnswer(answerQuery).getList().get(0));
		}
		return answerExporter.downloadAttachmentZip(project, listAnswer(answerQuery).getList(), query);
	}

	/** 全部答卷都同步过明细才走投影；与统计用同一判据（items_synced 而不是投影行数） */
	private boolean projectionCoversAnswers(String projectId) {
		AnswerQuery countQuery = new AnswerQuery();
		countQuery.setProjectId(projectId);
		long total = count(countQuery);
		if (total <= 0) {
			return false;
		}
		return answerItemMapper.countSyncedAnswers(projectId) >= total;
	}

	/** 按答卷 id 批量取明细（500 一批），把 answer 重建回视图；投影是派生数据，真源仍是 answer JSON */
	private void fillAnswersFromProjection(List<AnswerView> views) {
		if (views == null || views.isEmpty()) {
			return;
		}
		List<String> answerIds = views.stream().map(AnswerView::getId).filter(Objects::nonNull)
				.collect(Collectors.toList());
		Map<String, List<AnswerItem>> itemsByAnswer = new HashMap<>();
		for (int from = 0; from < answerIds.size(); from += 500) {
			List<String> chunk = answerIds.subList(from, Math.min(from + 500, answerIds.size()));
			for (AnswerItem item : answerItemMapper.selectByAnswerIds(chunk)) {
				itemsByAnswer.computeIfAbsent(item.getAnswerId(), key -> new ArrayList<>()).add(item);
			}
		}
		views.forEach(view -> view.setAnswer(
				answerItemAnswerRebuilder.rebuild(itemsByAnswer.getOrDefault(view.getId(), Collections.emptyList()))));
	}

	@Override
	public List<AnswerView> listAnswerDeleted(AnswerQuery query) {
		List<AnswerView> list = answerViewMapper.toView(getBaseMapper().selectLogicDeleted(query.getProjectId()));
		Project project = projectMapper.selectById(query.getProjectId());
		FlatSurveySchemaByType schemaByType = answerSchemaDecorator.parseSurveySchemaByType(project.getSurvey());
		list.forEach(view -> answerSchemaDecorator.setAnswerExtraInfo(view, schemaByType));
		return list;
	}

	@Override
	public void batchDestroyAnswer(AnswerRequest request) {
		answerAccessGuard.assertAnswersAccess(request.getIds());
		this.getBaseMapper().batchDestroy(request.getIds());
	}

	@Override
	public void restoreAnswer(AnswerRequest request) {
		answerAccessGuard.assertAnswersAccess(request.getIds());
		this.getBaseMapper().restoreAnswer(request.getIds());
	}

	@Override
	public AnswerUploadView upload(AnswerUploadRequest request) {
		return answerUploadParser.upload(request, this::saveBatch);
	}

	@Override
	public PaginationResponse<ExerciseView> historyExercise(HistoryExerciseQuery query) {
		return exerciseAnswerService.historyExercise(query);
	}

	@Override
	public void deleteExercise(AnswerRequest request) {
		exerciseAnswerService.deleteExercise(request);
	}

}
