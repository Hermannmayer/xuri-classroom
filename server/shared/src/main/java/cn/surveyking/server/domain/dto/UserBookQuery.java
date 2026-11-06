package cn.surveyking.server.domain.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.format.annotation.DateTimeFormat;

import java.util.Date;

/**
 * @author javahuang
 * @date 2022/09/08
 */
@Data
@EqualsAndHashCode(callSuper = false)
public class UserBookQuery extends PageQuery {

	private Integer type;

	@DateTimeFormat(pattern = "yyyy-MM-dd")
	private Date startDate;

	@DateTimeFormat(pattern = "yyyy-MM-dd")
	private Date endDate;

	private String name;

	/**
	 * 出错次数下限（含）。用于「错过 2 次以上 / 3 次以上」的筛选。
	 */
	private Integer wrongTimesMin;

	/**
	 * 标记状态：1 已掌握（标记为简单），2 重点标记。为空表示不筛选。
	 */
	private Integer status;

}
