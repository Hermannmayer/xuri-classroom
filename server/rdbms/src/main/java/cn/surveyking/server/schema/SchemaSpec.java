package cn.surveyking.server.schema;

import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import lombok.Data;










@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class SchemaSpec {


	private Baseline baseline = new Baseline();


	private List<VersionSpec> versions = new ArrayList<>();

	@Data
	@JsonIgnoreProperties(ignoreUnknown = true)
	public static class Baseline {

		private List<String> requires = new ArrayList<>();

	}

	@Data
	@JsonIgnoreProperties(ignoreUnknown = true)
	public static class VersionSpec {

		private String version;

		private List<String> requires = new ArrayList<>();

	}

}
