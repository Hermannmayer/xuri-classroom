package cn.surveyking.server.domain.dto;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;





@Data
public class CommDictItemRequest {

	private MultipartFile file;




	private String id;




	private String dictCode;




	private String itemName;




	private String itemValue;




	private String parentItemValue;




	private Integer itemLevel;




	private Integer itemOrder;

}
