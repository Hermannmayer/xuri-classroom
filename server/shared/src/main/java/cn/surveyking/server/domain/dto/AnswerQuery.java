package cn.surveyking.server.domain.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.format.annotation.DateTimeFormat;

import java.util.Date;
import java.util.List;





@Data
@EqualsAndHashCode(callSuper = false)
public class AnswerQuery extends PageQuery {

	private String id;

	private String projectId;

	private List<String> ids;

	private String ip;

	private String cookie;





	@DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
	private Date startTime;


	@DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
	private Date endTime;

	private String createBy;


	private String classId;





	private Integer attemptNo;





	private String gradeStatus;








	private String createByName;






	private Double minScore;





	private Double maxScore;









	private Boolean aiReview;

	private Boolean includeAnonymous;


	private Boolean excludeAnonymous;


	private Boolean latest;

	private boolean rankEnabled;




	private String valueQuery;

}
