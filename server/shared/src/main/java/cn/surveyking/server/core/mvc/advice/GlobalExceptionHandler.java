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

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ValidationException;




















@ControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

	@ExceptionHandler(NoHandlerFoundException.class)
	public ResponseEntity<ApiResponse<String>> handleError404(HttpServletRequest request, Exception e) {


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


		String traceId = java.util.UUID.randomUUID().toString().substring(0, 8);
		log.error("handleInternalServerError traceId={} uri={} method={}", traceId, request.getRequestURI(),
				request.getMethod(), ex);
		String reason = ex instanceof InternalServerError ? ex.getMessage() : readableReason(ex);
		String message = "服务处理失败（编号 " + traceId + "）"
				+ (StringUtils.isNotBlank(reason) ? "：" + reason : "")
				+ "。把编号告诉管理员即可在服务端日志里查到完整原因";
		return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.body(new ApiResponse<>(ResponseCode.INTERNAL_SERVER_ERROR.code, message));
	}

	/** 把未预期异常压成一句「用户看得懂、又不泄露内部细节」的原因 */
	private static String readableReason(Throwable ex) {
		if (ex == null) {
			return null;
		}
		Throwable root = ex;
		while (root.getCause() != null && root.getCause() != root) {
			root = root.getCause();
		}
		String type = root.getClass().getSimpleName();
		String raw = root.getMessage();
		if (StringUtils.isBlank(raw)) {
			return type;
		}
		String first = raw.split("\\R", 2)[0].trim();


		java.util.regex.Matcher missingColumn = java.util.regex.Pattern
				.compile("Unknown column '([^']+)'", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(first);
		if (missingColumn.find()) {
			return "数据库缺少列 " + missingColumn.group(1) + "：说明数据库结构没有升级到当前程序版本。"
					+ "重启服务会自动补；也可以在「系统设置 → 系统与更新」点「检查并升级数据库结构」。";
		}
		java.util.regex.Matcher missingTable = java.util.regex.Pattern
				.compile("Table '([^']+)' doesn't exist", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(first);
		if (missingTable.find()) {
			return "数据库缺少表 " + missingTable.group(1) + "：说明数据库结构没有升级到当前程序版本。"
					+ "重启服务会自动补；也可以在「系统设置 → 系统与更新」点「检查并升级数据库结构」。";
		}
		if (first.matches("(?i).*(select|insert|update|delete)\\s+.*|.*jdbc.*|.*sqlstate.*|.*sqlexception.*")) {
			return "数据库读写失败（" + type + "），请稍后重试或把编号告诉管理员";
		}
		if (first.length() > 120) {
			first = first.substring(0, 120) + "…";
		}
		return type + "：" + first;
	}

	/** 业务错误码 → HTTP 状态 */
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
