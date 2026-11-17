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

/**
 * 滑块/点选验证码接口。
 *
 * <p>
 * 路径与响应体必须和 aj-captcha 的原版控制器保持一致：前端 {@code LoginCaptcha.tsx} 直接读
 * {@code repCode / repMsg / repData}，并且用 {@code repData.secretKey} 做 AES 加密后拿到
 * {@code captchaVerification}。所以这里原样返回 {@link ResponseModel}，不套本项目的 ApiResponse 信封。
 *
 * <p>
 * 原版控制器在 {@code spring-boot-starter-captcha} 里，是 {@code javax.servlet} 写的，
 * Jakarta 容器下无法加载，因此由这个类接管；真正的拼图、校验、缓存逻辑仍在
 * {@code com.anji-plus:captcha} 核心包（{@link CaptchaService}）里，没有重写。
 */
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
