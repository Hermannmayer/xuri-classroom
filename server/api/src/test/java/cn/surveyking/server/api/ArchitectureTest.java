package cn.surveyking.server.api;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

/**
 * 分层边界：把「Controller 直连 Mapper」「实现反向依赖 Controller」这类回潮挡在构建期。
 *
 * <p>
 * 只收三条已经站得住的规则。没加「api 不得依赖 impl」——公开查询、考试控制、提交校验这几个组件
 * 现在就在 impl 包里被 Controller 直接调用，先立规则会立刻红；等它们搬进独立的 service.support 包再加。
 */
@AnalyzeClasses(packages = "cn.surveyking.server", importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {

	@ArchTest
	static final ArchRule controllers_should_not_access_mappers = noClasses().that()
			.resideInAPackage("..server.api..").should().dependOnClassesThat().resideInAPackage("..server.mapper..");

	@ArchTest
	static final ArchRule implementations_should_not_depend_on_controllers = noClasses().that()
			.resideInAPackage("..server.impl..").should().dependOnClassesThat().resideInAPackage("..server.api..");

	@ArchTest
	static final ArchRule service_interfaces_should_not_depend_on_impl = noClasses().that()
			.resideInAPackage("..server.service..").should().dependOnClassesThat().resideInAPackage("..server.impl..");

}
