package cn.surveyking.server.service;

import cn.surveyking.server.domain.dto.ComposeCreateResult;
import cn.surveyking.server.domain.dto.ComposePickRequest;
import cn.surveyking.server.domain.dto.ComposePlan;
import cn.surveyking.server.domain.dto.ComposeRequest;
import cn.surveyking.server.domain.dto.ComposeStats;
import cn.surveyking.server.domain.dto.SurveySchema;

import java.util.List;


public interface ComposeService {

	ComposeStats stats(List<String> repoIds);

	ComposePlan plan(ComposeRequest request);

	ComposeCreateResult create(ComposeRequest request);

	List<SurveySchema> pick(ComposePickRequest request);

}
