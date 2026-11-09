package cn.surveyking.server.mapper;

import cn.surveyking.server.domain.model.Account;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;

/**
 * @author javahuang
 * @date 2021/10/12
 */
public interface AccountMapper extends BaseMapper<Account> {

	int physicallyDeleteExternal(@Param("id") String id, @Param("userId") String userId);

	int physicallyDeleteExternalByUserId(@Param("userId") String userId);

}
