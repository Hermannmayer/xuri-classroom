package cn.surveyking.server.domain.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.util.Date;





@Data
public class CommDictView {

	private String id;




	private String code;




	private String name;




	private String remark;




	private Integer dictType;

	@JsonFormat(pattern = "yyyy-MM-dd HH:mm")
	private Date createAt;

}
