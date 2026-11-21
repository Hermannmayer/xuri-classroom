package cn.surveyking.server.domain.model;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.util.Date;








@Data
@TableName("t_answer_item")
public class AnswerItem {

	@TableId
	private String id;

	private String answerId;

	private String projectId;

	private String questionId;

	private String questionType;

	private String optionId;


	private String valueJson;

	private String valueKey;

	private Double score;

	private Date createAt;

}