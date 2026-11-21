package cn.surveyking.server.core.mybatis;

import com.baomidou.mybatisplus.extension.handlers.Jackson3TypeHandler;
import com.baomidou.mybatisplus.extension.plugins.MybatisPlusInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.PaginationInnerInterceptor;
import tools.jackson.databind.ObjectMapper;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;





@Configuration
@MapperScan("cn.surveyking.server.mapper")
public class MybatisPlugConfig {

	private final ObjectMapper objectMapper;

	public MybatisPlugConfig(ObjectMapper objectMapper) {
		this.objectMapper = objectMapper;

		Jackson3TypeHandler.setObjectMapper(objectMapper);
	}

	/**
	 * 新的分页插件,一缓和二缓遵循mybatis的规则,需要设置 MybatisConfiguration#useDeprecatedExecutor = false
	 * 避免缓存出现问题(该属性会在旧插件移除后一同移除)
	 */
	@Bean
	public MybatisPlusInterceptor mybatisPlusInterceptor() {
		MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
		interceptor.addInnerInterceptor(new PaginationInnerInterceptor());
		return interceptor;
	}







}
