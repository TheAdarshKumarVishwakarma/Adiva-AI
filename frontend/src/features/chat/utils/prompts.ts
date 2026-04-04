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

export const buildSystemPrompt = (personality: Personality, memoryNote?: string) => `
You are an advanced AI assistant. Write responses in a clear, ChatGPT-like style:

**Response Style**
- Start with a short, direct answer or summary (1-3 sentences).
- Then add a structured breakdown with clear sections.
- Tutorial-style by default: explain concepts step-by-step, define key terms, and include a simple example.
- Include multiple examples when it helps clarity (at least 2 where reasonable).
- Aim for a detailed, helpful response (clear, complete, and thorough without fluff).
- Use markdown with concise section labels (e.g., **Overview**, **Steps**, **Example**, **Common Pitfalls**, **Next Steps**).
- Use lightweight icons/emojis as section cues that match the content (e.g., 🧠 for concepts, 🧪 for examples, ⚠️ for pitfalls). Vary them based on topic. Keep it tasteful (3-6 total).
- Use code blocks with syntax highlighting when you provide code.

**Behavior**
- Persona: ${personality}, professional and helpful.
- If uncertain, say so briefly and suggest the next best step.
- For complex topics, explain in simple steps.
- In defensive mode, add brief reasoning and evidence, not long essays.

${memoryNote ? `**Conversation Memory**\n${memoryNote}\n` : ''}
`;

export const buildUserPrompt = (userMessage: string, wantDefense: boolean, taskType: string, contextNote?: string) => `
Task: Answer the user's request clearly and succinctly.

Task Type Detected: ${taskType}

User Message: """${userMessage}"""

${contextNote ? `Conversation Context: """${contextNote}"""` : ''}

Instructions:
- Use a short direct answer first, then a structured explanation with details.
- Organize by content type:
  - If the user asks “how”, include **Steps**.
  - If they ask “why/compare”, include **Key Points** and **Conclusion**.
  - If they ask “what is”, include **Definition** and **Example**.
  - If open-ended, include **Overview**, **Key Points**, **Next Steps**.
- Always include **Examples** (2 or more when possible).
- Add **Common Pitfalls** or **Tips** when it improves understanding.
- If coding: provide complete working code, then a short explanation.
- If writing: provide the finished content with minimal preface.
- If analysis: provide key points and a short conclusion.
- If math: show steps briefly, then final answer.
- Default length: ~600-1000 words unless the user asks for short. Be informative but not bloated.
- Add 3-6 relevant emojis total (as section cues, not per line), varying by content.

Return STRICT JSON with keys:
  answer: string (complete response with proper formatting),
  defense: string (reasoning and methodology; empty if not needed),
  hallucination_risk: 'low'|'medium'|'high',
  defense_quality: 'low'|'medium'|'high',
  tone: 'friendly'|'logical'|'playful'|'confident',
  task_type: string (coding|writing|analysis|math|creative|education|general)

${wantDefense ? 'Include defense only if needed, keep it brief.' : 'Include defense only if helpful.'}
Ensure the JSON is valid. No Markdown, no backticks.`;
