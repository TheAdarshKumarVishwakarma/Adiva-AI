export const safeParse = <T,>(raw: string, fallback: T): T => {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const normalizeJsonText = (raw: string) =>
  raw
    .trim()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");

export const parseAIJson = (raw: string) => {
  const normalized = normalizeJsonText(raw);
  const first = normalized.indexOf('{');
  const last = normalized.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return null;
  const slice = normalized.slice(first, last + 1);
  try {
    return JSON.parse(slice);
  } catch {
    return null;
  }
};

export const extractAnswerFromJsonLike = (raw: string) => {
  const normalized = normalizeJsonText(raw);
  const jsonObj = parseAIJson(normalized);
  if (jsonObj && typeof jsonObj.answer === 'string') {
    return { answer: jsonObj.answer, defense: jsonObj.defense, meta: jsonObj };
  }

  const match = normalized.match(
    /"answer"\s*:\s*"([\s\S]*?)"\s*,\s*"(defense|hallucination_risk|defense_quality|tone|task_type)"/
  );
  if (!match) return null;
  try {
    const decoded = JSON.parse(`"${match[1]}"`);
    return { answer: decoded, defense: '' };
  } catch {
    return { answer: match[1], defense: '' };
  }
};

export const extractPlainAnswer = (raw: string) => {
  const extracted = extractAnswerFromJsonLike(raw);
  return extracted?.answer || raw;
};
