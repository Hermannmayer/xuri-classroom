package cn.surveyking.server.domain.model;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.util.Date;

/** 组卷批次：一次从题库组建 N 份独立卷子 */
@Data
@TableName("t_paper_batch")
public class PaperBatch {

	@TableId(type = IdType.INPUT)
	private String id;

	private String name;

	private String rulesJson;

	private Long seed;

	private Integer sets;

	private String createBy;

	private Date createAt;

}
