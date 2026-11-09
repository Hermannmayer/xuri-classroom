package cn.surveyking.server.core.mvc.advice;

import cn.surveyking.server.core.common.ApiResponse;
import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.constant.ResponseCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.exception.InternalServerError;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.NoHandlerFoundException;

import javax.servlet.http.HttpServletRequest;
import javax.validation.ValidationException;

/**
 * 全局异常出口。
 *
 * <p>
 * 2026-11 S3-7：HTTP 状态码与 {@code body.code} 对齐。此前所有异常一律
 * {@code ResponseEntity.ok()}，导致前端、网关、冒烟脚本都无法从状态码看出请求失败，
 * 只能解析 body。现在：
 * <ul>
 * <li>参数/校验类 → 400</li>
 * <li>权限不足 → 403</li>
 * <li>业务错误码里语义明确的「不存在」「未登录」→ 404 / 401</li>
 * <li>其余业务错误码 → 400（body.code 仍是原业务码，前端契约不变）</li>
 * <li>未预期异常 → 500</li>
 * </ul>
 * body 结构保持 {code,message,data} 不变，前端只按 body.code 分支，因此不受影响。
 *
 * @author javahuang
 * @date 2021/08/13
 */
@ControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

	@ExceptionHandler(NoHandlerFoundException.class)
	public ResponseEntity<ApiResponse<String>> handleError404(HttpServletRequest request, Exception e) {
		// 前端已迁到独立的 nginx / vite，jar 里不再打包 SPA 入口；
		// 后端遇到未知路径直接返回 JSON 404，而不是去找已删除的 static/index.html。
		return ResponseEntity.status(HttpStatus.NOT_FOUND)
				.body(new ApiResponse<>(ResponseCode.NOT_FOUND.code, "接口不存在：" + request.getRequestURI()));
	}

	@ExceptionHandler(ValidationException.class)
	public ResponseEntity<ApiResponse<String>> handleValidationException(HttpServletRequest request,
			ValidationException ex) {
		log.error("ValidationException {}\n", request.getRequestURI(), ex);

		return ResponseEntity.status(HttpStatus.BAD_REQUEST)
				.body(new ApiResponse<>(ResponseCode.FAIL.code, ex.getMessage()));
	}

	@ExceptionHandler(MissingServletRequestParameterException.class)
	public ResponseEntity<ApiResponse<String>> handleMissingServletRequestParameterException(HttpServletRequest request,
			MissingServletRequestParameterException ex) {
		log.error("handleMissingServletRequestParameterException {}\n", request.getRequestURI(), ex);

		return ResponseEntity.status(HttpStatus.BAD_REQUEST)
				.body(new ApiResponse<>(ResponseCode.FAIL.code, "Missing request parameter"));
	}

	@ExceptionHandler(MethodArgumentTypeMismatchException.class)
	public ResponseEntity<ApiResponse<String>> handleMethodArgumentTypeMismatchException(HttpServletRequest request,
			MethodArgumentTypeMismatchException ex) {
		log.error("handleMethodArgumentTypeMismatchException {}\n", request.getRequestURI(), ex);

		return ResponseEntity.status(HttpStatus.BAD_REQUEST)
				.body(new ApiResponse<>(ResponseCode.FAIL.code, "Method argument type mismatch"));
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<ApiResponse<String>> handleMethodArgumentNotValidException(HttpServletRequest request,
			MethodArgumentNotValidException ex) {
		log.error("handleMethodArgumentNotValidException {}\n", request.getRequestURI(), ex);

		return ResponseEntity.status(HttpStatus.BAD_REQUEST)
				.body(new ApiResponse<>(ResponseCode.FAIL.code, "Method argument validation failed"));
	}

	/** 请求体不是合法 JSON / 反序列化失败：这是客户端问题，不该记成 500 */
	@ExceptionHandler(HttpMessageNotReadableException.class)
	public ResponseEntity<ApiResponse<String>> handleHttpMessageNotReadableException(HttpServletRequest request,
			HttpMessageNotReadableException ex) {
		log.error("handleHttpMessageNotReadableException {}\n", request.getRequestURI(), ex);

		return ResponseEntity.status(HttpStatus.BAD_REQUEST)
				.body(new ApiResponse<>(ResponseCode.FAIL.code, "Malformed request body"));
	}

	@ExceptionHandler(HttpRequestMethodNotSupportedException.class)
	public ResponseEntity<ApiResponse<String>> handleHttpRequestMethodNotSupportedException(HttpServletRequest request,
			HttpRequestMethodNotSupportedException ex) {
		log.error("handleHttpRequestMethodNotSupportedException {}\n", request.getRequestURI(), ex);

		return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
				.body(new ApiResponse<>(HttpStatus.METHOD_NOT_ALLOWED.value(), "HTTP method not supported"));
	}

	@ExceptionHandler(HttpMediaTypeNotSupportedException.class)
	public ResponseEntity<ApiResponse<String>> handleHttpMediaTypeNotSupportedException(HttpServletRequest request,
			HttpMediaTypeNotSupportedException ex) {
		log.error("handleHttpMediaTypeNotSupportedException {}\n", request.getRequestURI(), ex);

		return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
				.body(new ApiResponse<>(HttpStatus.UNSUPPORTED_MEDIA_TYPE.value(), "Unsupported media type"));
	}

	@ExceptionHandler(AccessDeniedException.class)
	public ResponseEntity<ApiResponse<String>> handleAccessDeniedException(HttpServletRequest request,
			AccessDeniedException ex) {
		log.error("handleAccessDeniedException {}\n", request.getRequestURI());

		// 业务代码里抛的 403 通常带着可读的中文原因（「无权访问该答卷」「不能把用户放进该用户组」等），
		// 一律改写成 "Authentication failed" 会让前端只能显示英文，既不好排查也帮不到用户。
		// Spring Security 自身抛的异常 message 一般是短英文，直接透出也不含内部细节。
		String message = org.springframework.util.StringUtils.hasText(ex.getMessage()) ? ex.getMessage()
				: "Authentication failed";
		return ResponseEntity.status(HttpStatus.FORBIDDEN)
				.body(new ApiResponse<>(ResponseCode.FORBIDDEN.code, message));
	}

	@ExceptionHandler(ErrorCodeException.class)
	public ResponseEntity<ApiResponse<String>> handleErrorCodeException(HttpServletRequest request,
			ErrorCodeException ex) {
		ErrorCode errorCode = ex.getErrorCode();
		String errorMessage = StringUtils.defaultIfBlank(ex.getMessage(), errorCode.message);
		log.error("handleErrorCodeError {} errorCode={}, errorMessage={}", request.getRequestURI(), errorCode.code,
				errorMessage, ex);
		return ResponseEntity.status(statusFor(errorCode)).body(new ApiResponse<>(errorCode.code, errorMessage));
	}

	@ExceptionHandler(Exception.class)
	public ResponseEntity<ApiResponse<String>> handleInternalServerError(HttpServletRequest request, Exception ex) {
		log.error("handleInternalServerError {}\n", request.getRequestURI(), ex);
		return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.body(new ApiResponse<>(ResponseCode.INTERNAL_SERVER_ERROR.code,
						ex instanceof InternalServerError ? ex.getMessage() : "服务出了点问题"));
	}

	/**
	 * 业务错误码 → HTTP 状态。默认 400：业务规则拒绝（暂停回收、超出截止时间、回收上限……）
	 * 本质都是「这次请求不成立」，而不是服务端故障。
	 */
	private static HttpStatus statusFor(ErrorCode errorCode) {
		switch (errorCode) {
			case PermVerifyFailed:
				return HttpStatus.FORBIDDEN;
			case UsernameOrPasswordError:
				return HttpStatus.UNAUTHORIZED;
			case ProjectNotFound:
			case FileNotExists:
			case QueryNotExist:
			case QueryDisabled:
				return HttpStatus.NOT_FOUND;
			default:
				return HttpStatus.BAD_REQUEST;
		}
	}

}
