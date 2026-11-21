package cn.surveyking.server.domain.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;
import org.springframework.format.annotation.DateTimeFormat;

import java.util.Date;





@Data
public class UserBookView {

	private String id;




	private String templateId;




	private String name;




	private Integer wrongTimes;




	private String note;




	private Integer status;




	private Integer type;




	private String projectId;

	@JsonFormat(pattern = "yyyy-MM-dd HH:mm")
	@DateTimeFormat(pattern = "yyyy-MM-dd HH:mm")
	private Date createAt;

	private Date updateAt;

	private Double qscore;






	private Boolean available;


	private String unavailableReason;

}
