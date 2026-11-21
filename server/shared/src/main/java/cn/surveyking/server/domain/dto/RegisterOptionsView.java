package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.List;






@Data
public class RegisterOptionsView {


	private boolean globalEnabled;


	private boolean enabled;


	private String reason;


	private List<RegisterClassView> classes;

}
