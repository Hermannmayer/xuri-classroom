package cn.surveyking.server.domain.model;

import cn.surveyking.server.core.constant.ExamExerciseTypeEnum;
import cn.surveyking.server.core.model.BaseModel;
import cn.surveyking.server.domain.dto.AnswerExamInfo;
import cn.surveyking.server.domain.dto.AnswerMetaInfo;
import cn.surveyking.server.domain.dto.SurveySchema;
import com.baomidou.mybatisplus.annotation.*;
import com.baomidou.mybatisplus.extension.handlers.Jackson3TypeHandler;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.apache.ibatis.type.JdbcType;

import java.util.Date;
import java.util.LinkedHashMap;





@Data
@TableName(value = "t_answer", autoResultMap = true)
@EqualsAndHashCode(callSuper = false)
public class Answer extends BaseModel {

	@TableId(type = IdType.ASSIGN_UUID)
	private String id;

	private String projectId;

	private String repoId;






	private String classId;





	private String anonymousSubjectId;


	@TableField("is_anonymous")
	private Boolean isAnonymous = false;





	private String answererName;








	private String gradeStatus;


	private String gradedBy;


	private Date gradedAt;




	@TableField(typeHandler = Jackson3TypeHandler.class, jdbcType = JdbcType.LONGVARCHAR)
	private LinkedHashMap tempAnswer;




	@TableField(typeHandler = Jackson3TypeHandler.class, jdbcType = JdbcType.LONGVARCHAR)
	private LinkedHashMap answer;




	@TableField(typeHandler = Jackson3TypeHandler.class, jdbcType = JdbcType.LONGVARCHAR)
	private SurveySchema survey;

	@TableField(typeHandler = Jackson3TypeHandler.class, jdbcType = JdbcType.LONGVARCHAR)
	private AnswerMetaInfo metaInfo;




	private Double examScore;




	@TableField(typeHandler = Jackson3TypeHandler.class, jdbcType = JdbcType.LONGVARCHAR)
	private AnswerExamInfo examInfo;




	private Integer tempSave;




	private ExamExerciseTypeEnum examExerciseType;

	@TableField(fill = FieldFill.INSERT)
	private String createBy;







	private Integer itemsSynced;








	private Integer attemptNo;

	@TableField(fill = FieldFill.UPDATE)
	private Date updateAt;

}
