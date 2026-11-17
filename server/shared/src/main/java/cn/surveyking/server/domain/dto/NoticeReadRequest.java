package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.List;

/**
 * 批量标记公告已读。
 *
 * <p>{@link #id} 与 {@link #ids} 合并生效（去重），只标记「当前用户看得到」的公告：
 * 别人的公告 id 传进来也不会写进已读表，避免被拿来探测公告是否存在。
 */
@Data
public class NoticeReadRequest {

	/** 单条公告 id */
	private String id;

	/** 批量公告 id */
	private List<String> ids;

}
