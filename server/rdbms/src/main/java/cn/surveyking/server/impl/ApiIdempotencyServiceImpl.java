package cn.surveyking.server.impl;

import cn.surveyking.server.domain.model.ApiIdempotency;
import cn.surveyking.server.mapper.ApiIdempotencyMapper;
import cn.surveyking.server.service.ApiIdempotencyService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;







@Slf4j
@Service
@RequiredArgsConstructor
public class ApiIdempotencyServiceImpl implements ApiIdempotencyService {

	private final ApiIdempotencyMapper apiIdempotencyMapper;

	@Override
	public String find(String userId, String key) {
		if (!StringUtils.hasText(userId) || !StringUtils.hasText(key)) {
			return null;
		}
		ApiIdempotency row = apiIdempotencyMapper
				.selectOne(Wrappers.<ApiIdempotency>lambdaQuery().eq(ApiIdempotency::getUserId, userId)
						.eq(ApiIdempotency::getKeyValue, key).last("LIMIT 1"));
		return row == null ? null : row.getResultJson();
	}

	@Override
	public void remember(String userId, String key, String resultJson) {
		if (!StringUtils.hasText(userId) || !StringUtils.hasText(key)) {
			return;
		}
		ApiIdempotency row = new ApiIdempotency();
		row.setUserId(userId);
		row.setKeyValue(key);
		row.setResultJson(resultJson);
		try {
			apiIdempotencyMapper.insert(row);
		}
		catch (DuplicateKeyException e) {

			log.debug("幂等记录已存在，忽略写入 user={} key={}", userId, key);
		}
	}

}
