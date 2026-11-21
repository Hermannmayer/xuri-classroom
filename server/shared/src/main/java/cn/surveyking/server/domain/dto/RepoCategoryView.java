package cn.surveyking.server.domain.dto;

import lombok.Data;









@Data
public class RepoCategoryView {


	private String id;


	private String name;


	private String parentId;


	private String path;


	private String parentPath;


	private Integer count;

}
