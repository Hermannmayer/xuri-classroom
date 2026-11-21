package cn.surveyking.server.domain.dto;

import cn.surveyking.server.core.constant.AppConsts;
import lombok.Data;
import org.springframework.http.HttpHeaders;

import java.util.List;





@Data
public class FileQuery {

	public FileQuery() {
	}

	public FileQuery(String id) {
		this.id = id;
	}

	Integer type;

	List<String> ids;

	String projectId;

	String questionId;




	String id;

	AppConsts.DispositionTypeEnum dispositionType;

	HttpHeaders headers;

}
