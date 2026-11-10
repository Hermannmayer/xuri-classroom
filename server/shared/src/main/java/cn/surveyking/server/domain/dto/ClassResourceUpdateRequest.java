package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.Date;

/**
 * 修改一条班级资源分配（窗口 / 班级级开关）。
 */
@Data
public class ClassResourceUpdateRequest {

	private String id;

	/** 本班开始时间（epoch 毫秒）；空=继承全局 */
	private Long startAt;

	/** 本班结束时间（epoch 毫秒）；空=继承全局 */
	private Long endAt;

	/** 0=关闭 1=开放；不传表示不改 */
	private Integer status;

}
