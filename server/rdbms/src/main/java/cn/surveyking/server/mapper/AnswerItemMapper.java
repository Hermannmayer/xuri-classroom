package cn.surveyking.server.mapper;

import cn.surveyking.server.domain.dto.AnswerItemStat;
import cn.surveyking.server.domain.model.AnswerItem;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;




public interface AnswerItemMapper extends BaseMapper<AnswerItem> {

	/** 批量写入（每批 500 条）。 */
	int batchInsert(@Param("items") List<AnswerItem> items);

	/** 每题的回答人数（答了该题的人数，去重） */
	List<AnswerItemStat> statQuestions(@Param("projectId") String projectId);

	/** 每题每个选项的选择人数 */
	List<AnswerItemStat> statOptions(@Param("projectId") String projectId);


	long countSyncedAnswers(@Param("projectId") String projectId);

	/** S2-4：按答卷 id 批量取明细，供导出重建 answer。 */
	List<AnswerItem> selectByAnswerIds(@Param("answerIds") List<String> answerIds);

}
