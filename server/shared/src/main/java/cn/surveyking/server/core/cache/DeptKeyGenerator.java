package cn.surveyking.server.core.cache;

import org.springframework.cache.interceptor.KeyGenerator;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;





@Component("deptKeyGenerator")
public class DeptKeyGenerator implements KeyGenerator {

	@Override
	public Object generate(Object target, Method method, Object... params) {
		if (params[0] == null) {
			return "all";
		}
		return "some";
	}

}
