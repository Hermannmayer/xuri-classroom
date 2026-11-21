package cn.surveyking.server.flow.exception;





public class FlowableRuntimeException extends RuntimeException {

	public FlowableRuntimeException(String message) {
		super(message);
	}

	public FlowableRuntimeException(String message, Throwable cause) {
		super(message, cause);
	}

}
