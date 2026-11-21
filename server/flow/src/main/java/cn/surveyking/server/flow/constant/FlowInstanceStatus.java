package cn.surveyking.server.flow.constant;

import java.util.HashMap;
import java.util.Map;







public final class FlowInstanceStatus {




	public static final int SUBMITTED = 0;




	public static final int APPROVING = 1;




	public static final int REFUSED = 2;




	public static final int FINISHED = 3;




	public static final int STOPPED = 4;




	public static final int CANCELLED = 5;




	public static final int SUSPENDED = 6;

	private static final Map<Object, String> DICT_MAP = new HashMap<>(2);
	static {
		DICT_MAP.put(SUBMITTED, "已提交");
		DICT_MAP.put(APPROVING, "审批中");
		DICT_MAP.put(REFUSED, "已拒绝");
		DICT_MAP.put(FINISHED, "已结束");
		DICT_MAP.put(STOPPED, "提前停止");
		DICT_MAP.put(CANCELLED, "已取消");
		DICT_MAP.put(SUSPENDED, "申请人完善中");
	}

	public static String getDictStatus(int status) {
		return DICT_MAP.get(status);
	}

}
