import type { QuestionType } from '../schema/types';
import type { QuestionComponent } from './types';





const registry = new Map<QuestionType, QuestionComponent>();

export function registerQuestion(type: QuestionType, component: QuestionComponent) {
  registry.set(type, component);
}

export function getQuestionComponent(type: QuestionType): QuestionComponent | undefined {
  return registry.get(type);
}

export function registeredTypes(): QuestionType[] {
  return [...registry.keys()];
}
