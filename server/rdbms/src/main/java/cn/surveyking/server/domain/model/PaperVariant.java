package cn.surveyking.server.domain.model;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.util.Date;

/** 组卷套次：一套卷子的完整 survey JSON */
@Data
@TableName("t_paper_variant")
public class PaperVariant {

	@TableId(type = IdType.INPUT)
	private String id;

	private String batchId;

	private Integer seq;

	private String surveyJson;

	private String statsJson;

	private String projectId;

	private Date createAt;

}
