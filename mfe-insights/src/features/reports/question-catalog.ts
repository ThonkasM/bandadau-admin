/** Catálogo de preguntas sugeridas por tema (UC-19). Las claves viven en `reports.catalog.<tema>.<n>` (es/en). */
export const QUESTION_TOPICS = [
  { id: 'users', count: 6 },
  { id: 'credits', count: 6 },
  { id: 'events', count: 5 },
  { id: 'tickets', count: 5 },
  { id: 'content', count: 5 },
  { id: 'system', count: 5 },
] as const;

export type QuestionTopicId = (typeof QUESTION_TOPICS)[number]['id'];

export const questionKeys = (topic: (typeof QUESTION_TOPICS)[number]): string[] =>
  Array.from({ length: topic.count }, (_, i) => `reports.catalog.${topic.id}.q${i + 1}`);
