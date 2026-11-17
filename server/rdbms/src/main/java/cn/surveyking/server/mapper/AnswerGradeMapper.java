package cn.surveyking.server.mapper;

import cn.surveyking.server.domain.model.AnswerGrade;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

/**
 * 主观题人工批改明细。
 *
 * <p>目前只需要基础 CRUD：批改按 (answer_id, question_id) 单条 upsert，清空按 answer_id 批量删，
 * 统计批改进度直接走 t_answer.grade_status 的索引，没有额外的原生 SQL。
 *
 * @author grading
 */
public interface AnswerGradeMapper extends BaseMapper<AnswerGrade> {

}
