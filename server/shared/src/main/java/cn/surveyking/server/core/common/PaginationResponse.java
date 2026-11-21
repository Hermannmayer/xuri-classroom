package cn.surveyking.server.core.common;

import lombok.Data;

import java.util.List;





@Data
public class PaginationResponse<T> {

	private Long total;

	private List<T> list;

	private Integer current;

	private Integer pageSize;

	public PaginationResponse(Long total, List<T> list) {
		this.total = total;
		this.list = list;
	}

}
