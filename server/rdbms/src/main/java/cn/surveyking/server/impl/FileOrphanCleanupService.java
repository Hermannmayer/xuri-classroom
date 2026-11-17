package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.StorageTypeEnum;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.domain.model.File;
import cn.surveyking.server.mapper.AnswerMapper;
import cn.surveyking.server.mapper.FileMapper;
import cn.surveyking.server.service.FileService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 孤儿文件清理：把业务上再也指不到、但还占着磁盘的文件收掉。
 *
 * <p>为什么需要它（不指望业务删除路径永远不出错）：
 * <ul>
 * <li>**重签**：签名题每次保存都新传一个文件，旧 fileId 从答案里消失，但 t_file 行还在；</li>
 * <li>**上传后放弃**：学生传了签名/附件，最后没交卷，文件没有任何引用；</li>
 * <li>**历史数据**：`batchDestroyAnswer` 在本次改造之前物理删答卷时不清附件，
 *     这些行已经成了孤儿（answer_id 指向不存在的答卷）。</li>
 * </ul>
 *
 * <p>与业务删除的关系：答卷彻底删除走 {@code FileService#deleteByAnswers}、
 * 项目彻底删除走 {@code FileService#purgeProjectFiles}，都是**同步、精确**的；
 * 这里只是兜底，每天扫一次，分批处理，绝不一次性扫全表。
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class FileOrphanCleanupService {

	/** 每批处理条数：一次别扫太多，避免长事务把库锁住 */
	private static final int BATCH = 200;

	/** 单次任务最多处理多少批，防止极端情况下卡住调度线程 */
	private static final int MAX_ROUNDS = 50;

	/** 上传后一直没绑定答卷的附件保留天数：给「答题中途断了、过几天再来」留足余量 */
	private static final int UNBOUND_RETENTION_DAYS = 7;

	private final FileService fileService;

	/** 只用来做批量查询（FileService 接口没有暴露 list(Wrapper)） */
	private final FileMapper fileMapper;

	private final AnswerMapper answerMapper;

	/** 每天 03:47（避开 03:30 的匿名答卷清理），幂等可重跑 */
	@Scheduled(cron = "0 47 3 * * ?")
	public void purgeOrphanFiles() {
		int orphanAnswers = purgeOrphanAnswerFiles();
		int unboundUploads = purgeUnboundUploads();
		if (orphanAnswers + unboundUploads > 0) {
			log.info("[file-cleanup] 清理完成：失效答卷附件 {} 个，未绑定上传件 {} 个", orphanAnswers, unboundUploads);
		}
	}

	/**
	 * 第一步：{@code answer_id} 非空、但 t_answer 里已经没有这份答卷的文件。
	 * 典型来源是「改造前物理删答卷」和「匿名清理逻辑删后又彻底删」留下的。
	 */
	private int purgeOrphanAnswerFiles() {
		int removed = 0;
		String cursor = null;
		for (int round = 0; round < MAX_ROUNDS; round += 1) {
			List<File> batch = nextBatch(Wrappers.<File>lambdaQuery()
					.select(File::getId, File::getAnswerId)
					.isNotNull(File::getAnswerId).ne(File::getAnswerId, "")
					.gt(cursor != null, File::getId, cursor)
					.orderByAsc(File::getId), BATCH);
			if (batch.isEmpty()) {
				break;
			}
			cursor = batch.get(batch.size() - 1).getId();
			Set<String> answerIds = batch.stream().map(File::getAnswerId).filter(id -> id != null && !id.isEmpty())
					.collect(Collectors.toCollection(HashSet::new));
			if (answerIds.isEmpty()) {
				continue;
			}
			Set<String> alive = answerMapper
					.selectList(Wrappers.<Answer>lambdaQuery().select(Answer::getId).in(Answer::getId, answerIds))
					.stream().map(Answer::getId).collect(Collectors.toCollection(HashSet::new));
			for (File file : batch) {
				if (alive.contains(file.getAnswerId())) {
					continue;
				}
				fileService.purgeFile(file.getId());
				removed += 1;
			}
		}
		return removed;
	}

	/**
	 * 第二步：答卷附件类型、从来没有绑定过答卷、且创建时间早于保留天数的文件。
	 * 这类是「传了但最终没提交」的残留（签名重签也会留下前一笔）。
	 *
	 * <p>只认 {@code ANSWER_ATTACHMENT}(4)：题面富文本图片是 {@code QUESTION_IMAGE}(3)，不在此列。
	 */
	private int purgeUnboundUploads() {
		Date cutoff = new Date(System.currentTimeMillis() - UNBOUND_RETENTION_DAYS * 24L * 60L * 60L * 1000L);
		int removed = 0;
		String cursor = null;
		for (int round = 0; round < MAX_ROUNDS; round += 1) {
			List<File> batch = nextBatch(Wrappers.<File>lambdaQuery()
					.select(File::getId)
					.eq(File::getStorageType, StorageTypeEnum.ANSWER_ATTACHMENT.getType())
					.and(wrapper -> wrapper.isNull(File::getAnswerId).or().eq(File::getAnswerId, ""))
					.lt(File::getCreateAt, cutoff)
					.gt(cursor != null, File::getId, cursor)
					.orderByAsc(File::getId), BATCH);
			if (batch.isEmpty()) {
				break;
			}
			cursor = batch.get(batch.size() - 1).getId();
			for (File file : batch) {
				// 还没绑定答卷：可能学生正在答（超过 7 天的极端情况才可能命中），也可能是放弃了
				fileService.purgeFile(file.getId());
				removed += 1;
			}
		}
		return removed;
	}

	private List<File> nextBatch(
			com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<File> wrapper, int limit) {
		wrapper.last("limit " + limit);
		return fileMapper.selectList(wrapper);
	}

}