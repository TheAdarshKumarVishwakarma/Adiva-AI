import type { Personality } from '@/features/chat/types/chat';

export const detectChallenge = (text: string) => {
  const t = text.toLowerCase();
  const triggers = ['defend', 'why', 'how is that', 'i disagree', 'not true', 'prove', 'evidence', 'source'];
  return triggers.some((w) => t.includes(w));
};

export const detectTaskType = (text: string) => {
  const t = text.toLowerCase();

  if (
    t.includes('code') || t.includes('program') || t.includes('script') || t.includes('function') ||
    t.includes('algorithm') || t.includes('debug') || t.includes('fix') || t.includes('optimize') ||
    t.includes('java') || t.includes('python') || t.includes('javascript') || t.includes('c++') ||
    t.includes('c#') || t.includes('php') || t.includes('html') || t.includes('css') ||
    t.includes('sql') || t.includes('react') || t.includes('node') || t.includes('api') ||
    t.includes('write a program') || t.includes('create a program') || t.includes('implement') ||
    t.includes('class') || t.includes('method') || t.includes('variable') || t.includes('loop') ||
    t.includes('array') || t.includes('string') || t.includes('integer') || t.includes('boolean') ||
    t.includes('duplicate') || t.includes('find') || t.includes('search') || t.includes('sort') ||
    t.includes('reverse') || t.includes('swap') || t.includes('fibonacci') || t.includes('prime') ||
    t.includes('factorial') || t.includes('bubble sort') || t.includes('quick sort') ||
    t.includes('binary search') || t.includes('linked list') || t.includes('stack') ||
    t.includes('queue') || t.includes('tree') || t.includes('graph') || t.includes('hash') ||
    t.includes('recursion') || t.includes('iteration') || t.includes('optimization')
  ) {
    return 'coding';
  }

  if (t.includes('write') || t.includes('essay') || t.includes('article') || t.includes('story') ||
    t.includes('email') || t.includes('letter') || t.includes('report') || t.includes('blog')) {
    return 'writing';
  }

  if (t.includes('analyze') || t.includes('explain') || t.includes('compare') || t.includes('evaluate') ||
    t.includes('review') || t.includes('assess') || t.includes('examine')) {
    return 'analysis';
  }

  if (t.includes('calculate') || t.includes('solve') || t.includes('equation') || t.includes('math') ||
    t.includes('statistics') || t.includes('probability') || t.includes('formula')) {
    return 'math';
  }

  if (t.includes('create') || t.includes('design') || t.includes('imagine') || t.includes('brainstorm') ||
    t.includes('idea') || t.includes('creative') || t.includes('art')) {
    return 'creative';
  }

  if (t.includes('learn') || t.includes('teach') || t.includes('tutorial') || t.includes('guide') ||
    t.includes('how to') || t.includes('step by step') || t.includes('explain')) {
    return 'education';
  }

  return 'general';
};

export const buildSystemPrompt = (personality: Personality) => `
You are an advanced AI assistant. Write responses in a clear, ChatGPT-like style:

**Response Style**
- Start with a short, direct answer or summary (1-3 sentences).
- Then add a structured breakdown with bullets or numbered steps only if needed.
- Be concise and avoid repetition. Prefer clarity over verbosity.
- Unless the user explicitly asks for detailed or long answers, keep responses under ~200 words.
- Use markdown, but don't force headings unless they improve readability.
- Use code blocks with syntax highlighting when you provide code.

**Behavior**
- Persona: ${personality}, professional and helpful.
- If uncertain, say so briefly and suggest the next best step.
- For complex topics, explain in simple steps.
- In defensive mode, add brief reasoning and evidence, not long essays.
`;

export const buildUserPrompt = (userMessage: string, wantDefense: boolean, taskType: string) => `
Task: Answer the user's request clearly and succinctly.

Task Type Detected: ${taskType}

User Message: """${userMessage}"""

Instructions:
- Use a short direct answer first, then a brief structured explanation.
- If coding: provide complete working code, then a short explanation.
- If writing: provide the finished content with minimal preface.
- If analysis: provide key points and a short conclusion.
- If math: show steps briefly, then final answer.
- Keep the response concise (around 150-250 words) unless the user asks for more detail.

Return STRICT JSON with keys:
  answer: string (complete response with proper formatting),
  defense: string (reasoning and methodology; empty if not needed),
  hallucination_risk: 'low'|'medium'|'high',
  defense_quality: 'low'|'medium'|'high',
  tone: 'friendly'|'logical'|'playful'|'confident',
  task_type: string (coding|writing|analysis|math|creative|education|general)

${wantDefense ? 'Include defense only if needed, keep it brief.' : 'Include defense only if helpful.'}
Ensure the JSON is valid. No Markdown, no backticks.`;
