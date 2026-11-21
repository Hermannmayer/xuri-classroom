package cn.surveyking.server.flow.constant;

import java.util.HashMap;
import java.util.Map;







public final class FlowApprovalType {




	public static final String SAVE = "save";




	public static final String AGREE = "agree";




	public static final String REFUSE = "refuse";




	public static final String ROLLBACK = "rollback";




	public static final String REVERT = "revert";




	public static final String TRANSFER = "transfer";




	public static final String MULTI_SIGN = "multi_sign";




	public static final String MULTI_AGREE = "multi_agree";




	public static final String MULTI_REFUSE = "multi_refuse";




	public static final String MULTI_ABSTAIN = "multi_abstain";




	public static final String MULTI_CONSIGN = "multi_consign";




	public static final String STOP = "stop";




	public static final String TODO = "todo";

	public static final Map<Object, String> DICT_MAP = new HashMap<>(2);
	static {
		DICT_MAP.put(SAVE, "保存");
		DICT_MAP.put(AGREE, "同意");
		DICT_MAP.put(REFUSE, "拒绝");
		DICT_MAP.put(TRANSFER, "指派");
		DICT_MAP.put(MULTI_SIGN, "多实例会签");
		DICT_MAP.put(MULTI_AGREE, "会签同意");
		DICT_MAP.put(MULTI_REFUSE, "会签拒绝");
		DICT_MAP.put(MULTI_ABSTAIN, "会签弃权");
		DICT_MAP.put(MULTI_CONSIGN, "多实例加签");
		DICT_MAP.put(STOP, "中止");
		DICT_MAP.put(TODO, "待处理");
	}

}
