package cn.surveyking.server.impl;

import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.mapper.AnswerMapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * 一次性回填：把历史答卷展开成 t_answer_item。
 *
 * <p>
 * 默认不跑（否则每次启动都全量扫一遍）。需要时在 compose 里加环境变量
 * {@code SURVEY_KING_ANSWER_ITEMS_BACKFILL=true} 启动一次，日志出现 [backfill] 完成后再去掉。
 *
 * <p>
 * 幂等：{@link AnswerItemProjector#rebuild} 先删后插，可以重复执行。
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "surveyking.answer-items.backfill", havingValue = "true")
public class AnswerItemBackfill implements ApplicationRunner {

	private static final int PAGE_SIZE = 200;

	private final AnswerMapper answerMapper;

	private final AnswerItemProjector projector;

	@Override
	public void run(ApplicationArguments args) {
		log.info("[backfill] 开始重建 t_answer_item（分页 {}）", PAGE_SIZE);
		long pageNo = 1;
		long total = 0;
		long failed = 0;
		while (true) {
			Page<Answer> page = new Page<>(pageNo, PAGE_SIZE);
			answerMapper.selectPage(page, Wrappers.<Answer>lambdaQuery().isNotNull(Answer::getAnswer)
					.orderByAsc(Answer::getId));
			if (page.getRecords() == null || page.getRecords().isEmpty()) {
				break;
			}
			for (Answer answer : page.getRecords()) {
				try {
					projector.rebuild(answer);
					total += 1;
				}
				catch (Exception e) {
					failed += 1;
					log.warn("[backfill] 单份失败 answerId={}", answer.getId(), e);
				}
			}
			if (pageNo * PAGE_SIZE >= page.getTotal()) {
				break;
			}
			pageNo += 1;
		}
		log.info("[backfill] 完成：成功 {} 份，失败 {} 份", total, failed);
	}

}