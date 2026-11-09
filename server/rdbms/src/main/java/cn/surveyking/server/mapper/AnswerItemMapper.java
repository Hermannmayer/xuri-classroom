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

	/** 已经展开过明细的答卷数：与答卷总数相等才认为回填完成，否则统计回退到旧的内存算法 */
	@Select("SELECT COUNT(DISTINCT answer_id) FROM t_answer_item WHERE project_id = #{projectId}")
	long countDistinctAnswers(@Param("projectId") String projectId);

}