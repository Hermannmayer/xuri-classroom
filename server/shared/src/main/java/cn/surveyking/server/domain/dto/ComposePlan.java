package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;


@Data
public class ComposePlan {

	private String name;

	private Long seed;

	private Integer sets;

	private List<ComposeVariant> variants = new ArrayList<>();

	private List<String> warnings = new ArrayList<>();

}
