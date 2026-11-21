package cn.surveyking.server.api;

import cn.surveyking.server.core.uitls.IPUtils;
import com.anji.captcha.model.common.ResponseModel;
import com.anji.captcha.model.vo.CaptchaVO;
import com.anji.captcha.service.CaptchaService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;














@RestController
@RequestMapping("/captcha")
@RequiredArgsConstructor
public class CaptchaApi {

	private final CaptchaService captchaService;

	/** 取一张新图（底图 + 拼图块）。 */
	@PostMapping("/get")
	public ResponseModel get(@RequestBody CaptchaVO data, HttpServletRequest request) {
		data.setBrowserInfo(clientKey(request));
		return captchaService.get(data);
	}

	/** 校验拖动位置。成功后后端会把 verification 凭证写进缓存。 */
	@PostMapping("/check")
	public ResponseModel check(@RequestBody CaptchaVO data, HttpServletRequest request) {
		data.setBrowserInfo(clientKey(request));
		return captchaService.check(data);
	}

	/** 用 check 阶段发放的凭证做二次校验（登录等场景可选）。 */
	@PostMapping("/verify")
	public ResponseModel verify(@RequestBody CaptchaVO data, HttpServletRequest request) {
		data.setBrowserInfo(clientKey(request));
		return captchaService.verification(data);
	}

	private static String clientKey(HttpServletRequest request) {
		return request == null ? "" : IPUtils.getClientIpAddress(request);
	}

}
