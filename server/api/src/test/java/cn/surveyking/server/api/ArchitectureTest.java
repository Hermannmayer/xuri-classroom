package cn.surveyking.server.api;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import org.junit.jupiter.api.Tag;








@AnalyzeClasses(packages = "cn.surveyking.server", importOptions = ImportOption.DoNotIncludeTests.class)
@Tag("slow")
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
