package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.Date;





@Data
public class CommDictItemView {




	private String id;




	private String dictCode;




	private String itemName;




	private String itemValue;




	private String parentItemValue;




	private Integer itemLevel;




	private Integer itemOrder;

	private Date createAt;

}
