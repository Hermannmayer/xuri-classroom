package cn.surveyking.server.domain.model;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.util.Date;






@Data
@TableName(value = "t_tag", autoResultMap = true)
public class Tag implements Serializable {




	private String id;




	private String entityId;




	private String name;




	private String category;




	private Date createAt;




	private String createBy;

	private static final long serialVersionUID = 1L;

}