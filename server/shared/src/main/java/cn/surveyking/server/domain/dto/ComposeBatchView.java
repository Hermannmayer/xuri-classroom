package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.Date;

/** 试卷集列表项 */
@Data
public class ComposeBatchView {

	private String id;

	private String name;

	private Integer sets;

	private Long seed;

	private Date createAt;

	private int variantCount;

}
