package cn.surveyking.server.domain.dto;

import lombok.Data;

/**
 * 考试切屏上报：前端每次 visibilitychange 调一次，后端把次数累加到答卷的 metaInfo。
 *
 * @author javahuang
 */
@Data
public class PublicSwitchScreenRequest {

	private String projectId;

	/**
	 * 当前答卷 id；还没有答卷（未暂存/未提交）时可以为空，后端退回按「本用户最近一条记录」累计
	 */
	private String answerId;

}
