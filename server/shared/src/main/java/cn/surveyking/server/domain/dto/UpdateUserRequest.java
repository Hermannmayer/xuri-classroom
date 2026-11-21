package cn.surveyking.server.domain.dto;

import lombok.Data;

import jakarta.validation.constraints.NotBlank;
import java.util.Set;





@Data
public class UpdateUserRequest {

	@NotBlank
	private String fullName;

	private Set<String> authorities;

}
