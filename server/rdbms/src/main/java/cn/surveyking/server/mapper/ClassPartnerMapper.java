package cn.surveyking.server.mapper;

import cn.surveyking.server.domain.model.ClassPartner;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface ClassPartnerMapper extends BaseMapper<ClassPartner> {

	/**
	 * 物理删除：t_class_partner 上有 (dept_id,user_id) 唯一键，逻辑删除后再次授权同一个人会撞键。
	 * 班级授权是「可以随时重授」的轻量关系，不留审计负担。
	 */
	int hardDelete(@Param("id") String id, @Param("deptId") String deptId);

}
