import type { Content } from "./types";

/**
 * Content is looked up by id rather than passed as a prop, because a
 * Composition's defaultProps must be JSON-serialisable and a Content carries
 * React nodes. Register once here, register a Composition by id.
 */
const REGISTRY = new Map<string, Content>();

export const registerContent = (content: Content): Content => {
  REGISTRY.set(content.id, content);
  return content;
};

export const getContent = (id: string): Content => {
  const c = REGISTRY.get(id);
  if (!c) throw new Error(`No content registered under "${id}"`);
  return c;
};

export const contentIds = (): string[] => [...REGISTRY.keys()];
