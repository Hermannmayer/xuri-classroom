package cn.surveyking.server.mapper;

import cn.surveyking.server.domain.model.Account;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;





public interface AccountMapper extends BaseMapper<Account> {

	int physicallyDeleteExternal(@Param("id") String id, @Param("userId") String userId);

	int physicallyDeleteExternalByUserId(@Param("userId") String userId);

}
