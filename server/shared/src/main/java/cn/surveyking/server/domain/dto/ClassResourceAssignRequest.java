package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.Date;
import java.util.List;

/**
 * 给班级分配资源（P1：考试/问卷）。
 *
 * <p>一次可以分配多个资源；班级窗口与 status 对这批资源一致。窗口为空表示继承全局，
 * 非空时必须落在项目全局窗口内。
 */
@Data
public class ClassResourceAssignRequest {

	private String classId;

	/** 资源类型：project=考试/问卷（P1 只支持这个） */
	private String resourceType;

	private List<String> resourceIds;

	/** 本班开始时间；空=继承全局 */
	private Date startAt;

	/** 本班结束时间；空=继承全局 */
	private Date endAt;

	/** 0=关闭 1=开放；不传默认 1 */
	private Integer status;

}
