package cn.surveyking.server.mapper;

import cn.surveyking.server.domain.dto.AnswerItemStat;
import cn.surveyking.server.domain.model.AnswerItem;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

public interface AnswerItemMapper extends BaseMapper<AnswerItem> {

	/**
	 * 批量写入（每批 500 条）。逐条 insert 时 5000 份 × 100 题的回填要跑二十分钟，
	 * 多值 INSERT 能压到一两分钟；交卷路径（约 100 条）也走这里。
	 */
	@Insert("<script>INSERT INTO t_answer_item (id, answer_id, project_id, question_id, option_id, create_at) VALUES "
			+ "<foreach collection='items' item='item' separator=','>"
			+ "(#{item.id},#{item.answerId},#{item.projectId},#{item.questionId},#{item.optionId},#{item.createAt})"
			+ "</foreach></script>")
	int batchInsert(@Param("items") List<AnswerItem> items);

	/** 每题的回答人数（答了该题的人数，去重） */
	@Select("SELECT question_id AS questionId, COUNT(DISTINCT answer_id) AS cnt FROM t_answer_item "
			+ "WHERE project_id = #{projectId} GROUP BY question_id")
	List<AnswerItemStat> statQuestions(@Param("projectId") String projectId);

	/** 每题每个选项的选择人数 */
	@Select("SELECT question_id AS questionId, option_id AS optionId, COUNT(DISTINCT answer_id) AS cnt "
			+ "FROM t_answer_item WHERE project_id = #{projectId} AND option_id IS NOT NULL "
			+ "GROUP BY question_id, option_id")
	List<AnswerItemStat> statOptions(@Param("projectId") String projectId);

	/**
	 * 已同步过明细的答卷数。与答卷总数相等才走 SQL 聚合，否则回退内存算法。
	 * <p>
	 * 用 t_answer.items_synced 而不是 t_answer_item 的行数：没有选项的答卷展开后是 0 行，
	 * 按行数判断会永远「覆盖不全」。
	 */
	@Select("SELECT COUNT(*) FROM t_answer WHERE project_id = #{projectId} AND is_deleted = 0 AND items_synced = 1")
	long countSyncedAnswers(@Param("projectId") String projectId);

}