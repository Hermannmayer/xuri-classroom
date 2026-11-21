package cn.surveyking.server.domain.model;

import cn.surveyking.server.core.model.BaseModel;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.io.Serializable;
import java.util.Date;




@TableName(value = "t_comm_dict_item")
@Data
@EqualsAndHashCode(callSuper = false)
public class CommDictItem extends BaseModel {




	@TableField(value = "dict_code")
	private String dictCode;




	@TableField(value = "item_name")
	private String itemName;




	@TableField(value = "item_value")
	private String itemValue;




	@TableField(value = "parent_item_value")
	private String parentItemValue;




	@TableField(value = "item_level")
	private Integer itemLevel;




	@TableField(value = "item_order")
	private Integer itemOrder;

	@TableField(exist = false)
	private Boolean deleted = false;

	@TableField(exist = false)
	private static final long serialVersionUID = 1L;

}