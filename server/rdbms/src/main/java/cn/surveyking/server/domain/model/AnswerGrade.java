package cn.surveyking.server.domain.model;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.util.Date;











@Data
@TableName("t_answer_grade")
public class AnswerGrade {

	@TableId(type = IdType.ASSIGN_UUID)
	private String id;


	private String answerId;


	private String projectId;


	private String questionId;


	private Double score;


	private String comment;


	private String grader;


	private Date createAt;


	private Date updateAt;






	private String source = "manual";

}
