package cn.surveyking.server.domain.dto;

import lombok.Data;

/**
 * 查询当前登录用户在某场考试里的历次作答。
 *
 * @author javahuang
 */
@Data
public class PublicAttemptRequest {

	private String projectId;

}
