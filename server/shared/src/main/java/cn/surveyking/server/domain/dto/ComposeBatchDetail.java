package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/** 试卷集详情 */
@Data
public class ComposeBatchDetail {

	private ComposeBatchView batch;

	private List<ComposeVariant> variants = new ArrayList<>();

}
