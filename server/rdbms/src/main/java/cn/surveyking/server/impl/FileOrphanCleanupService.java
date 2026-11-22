package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.StorageTypeEnum;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.domain.model.File;
import cn.surveyking.server.domain.model.FileRef;
import cn.surveyking.server.mapper.AnswerMapper;
import cn.surveyking.server.mapper.FileMapper;
import cn.surveyking.server.mapper.FileRefMapper;
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
















@Component
@RequiredArgsConstructor
@Slf4j
public class FileOrphanCleanupService {


	private static final int BATCH = 200;


	private static final int MAX_ROUNDS = 50;


	private static final int UNBOUND_RETENTION_DAYS = 7;

	/** 导入预览上传的题目图片：用户取消导入 / 未保存时没有文件引用，保留 7 天后回收 */
	private static final int UNBOUND_IMAGE_RETENTION_DAYS = 7;

	private final FileService fileService;


	private final FileMapper fileMapper;

	private final AnswerMapper answerMapper;

	private final FileRefMapper fileRefMapper;

	/** 每天 03:47（避开 03:30 的匿名答卷清理），幂等可重跑 */
	@Scheduled(cron = "0 47 3 * * ?")
	public void purgeOrphanFiles() {
		int orphanAnswers = purgeOrphanAnswerFiles();
		int unboundUploads = purgeUnboundUploads();
		int unboundImages = purgeUnboundQuestionImages();
		if (orphanAnswers + unboundUploads + unboundImages > 0) {
			log.info("[file-cleanup] 清理完成：失效答卷附件 {} 个，未绑定上传件 {} 个，未引用题目图片 {} 个", orphanAnswers,
					unboundUploads, unboundImages);
		}
	}

	/** 第一步：answer_id 非空、但 t_answer 里已经没有这份答卷的文件 */
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

	/** 第二步：答卷附件类型、从来没有绑定过答卷、且创建时间早于保留天数的文件 */
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

				fileService.purgeFile(file.getId());
				removed += 1;
			}
		}
		return removed;
	}

	/** 第三步：导入预览上传、但从未被项目/题库引用的题目图片（用户取消导入、只预览未保存） */
	private int purgeUnboundQuestionImages() {
		Date cutoff = new Date(
				System.currentTimeMillis() - UNBOUND_IMAGE_RETENTION_DAYS * 24L * 60L * 60L * 1000L);
		int removed = 0;
		String cursor = null;
		for (int round = 0; round < MAX_ROUNDS; round += 1) {
			List<File> batch = nextBatch(Wrappers.<File>lambdaQuery()
					.select(File::getId)
					.eq(File::getStorageType, StorageTypeEnum.QUESTION_IMAGE.getType())
					.lt(File::getCreateAt, cutoff)
					.gt(cursor != null, File::getId, cursor)
					.orderByAsc(File::getId), BATCH);
			if (batch.isEmpty()) {
				break;
			}
			cursor = batch.get(batch.size() - 1).getId();
			Set<String> ids = batch.stream().map(File::getId).collect(Collectors.toCollection(HashSet::new));
			Set<String> bound = fileRefMapper
					.selectList(Wrappers.<FileRef>lambdaQuery().select(FileRef::getFileId)
							.in(FileRef::getFileId, ids))
					.stream().map(FileRef::getFileId).filter(id -> id != null && !id.isEmpty())
					.collect(Collectors.toCollection(HashSet::new));
			for (String id : ids) {
				if (bound.contains(id)) {
					continue;
				}
				fileService.purgeFile(id);
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