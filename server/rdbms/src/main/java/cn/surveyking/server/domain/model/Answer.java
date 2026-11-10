package cn.surveyking.server.domain.model;

import cn.surveyking.server.core.constant.ExamExerciseTypeEnum;
import cn.surveyking.server.core.model.BaseModel;
import cn.surveyking.server.domain.dto.AnswerExamInfo;
import cn.surveyking.server.domain.dto.AnswerMetaInfo;
import cn.surveyking.server.domain.dto.SurveySchema;
import com.baomidou.mybatisplus.annotation.*;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.apache.ibatis.type.JdbcType;

import java.util.Date;
import java.util.LinkedHashMap;

/**
 * @author javahuang
 * @date 2021/8/6
 */
@Data
@TableName(value = "t_answer", autoResultMap = true)
@EqualsAndHashCode(callSuper = false)
public class Answer extends BaseModel {

	@TableId(type = IdType.ASSIGN_UUID)
	private String id;

	private String projectId;

	private String repoId;

	/**
	 * 答题时所在的班级（t_dept.id，dept_type=class）。
	 * <p>新建答卷时按「学生班级 + 班级资源分配」解析写入；公开匿名、教职工答卷为 null。
	 * 班级分布统计优先用它，学员换班后历史答卷仍算在原来的班。
	 */
	private String classId;

	/**
	 * 暂存的答案
	 */
	@TableField(typeHandler = JacksonTypeHandler.class, jdbcType = JdbcType.LONGVARCHAR)
	private LinkedHashMap tempAnswer;

	/**
	 * 最终答案
	 */
	@TableField(typeHandler = JacksonTypeHandler.class, jdbcType = JdbcType.LONGVARCHAR)
	private LinkedHashMap answer;

	/**
	 * 问卷
	 */
	@TableField(typeHandler = JacksonTypeHandler.class, jdbcType = JdbcType.LONGVARCHAR)
	private SurveySchema survey;

	@TableField(typeHandler = JacksonTypeHandler.class, jdbcType = JdbcType.LONGVARCHAR)
	private AnswerMetaInfo metaInfo;

	/**
	 * 考试分数
	 */
	private Double examScore;

	/**
	 * 考试信息
	 */
	@TableField(typeHandler = JacksonTypeHandler.class, jdbcType = JdbcType.LONGVARCHAR)
	private AnswerExamInfo examInfo;

	/**
	 * 0 暂存 1 已完成
	 */
	private Integer tempSave;

	/**
	 * 考试练习模式
	 */
	private ExamExerciseTypeEnum examExerciseType;

	@TableField(fill = FieldFill.INSERT)
	private String createBy;

	/**
	 * 明细投影是否已经同步（0 未同步 / 1 已同步）。
	 * <p>
	 * 不能用「t_answer_item 里有几行」来判断：没有选项答案的答卷（纯文本、空卷）展开后是 0 行，
	 * 永远达不到「覆盖全部答卷」，统计就会永远回退到内存算法。
	 */
	private Integer itemsSynced;

	/**
	 * 同项目 + 同答题人的第几次作答（从 0 开始）。
	 * <p>
	 * 与 {@code (project_id, create_by, attempt_no)} 的唯一键一起，把「交卷幂等」从进程内窗口
	 * 升级成数据库约束：多实例并发重复提交时，只有一条能落库，另一条按唯一键冲突回读赢家。
	 * 注意 {@code create_by} 为 NULL（纯匿名）时 MySQL 唯一索引不生效，这类提交仍只靠设备 cookie 限次。
	 */
	private Integer attemptNo;

	@TableField(fill = FieldFill.UPDATE)
	private Date updateAt;

}
