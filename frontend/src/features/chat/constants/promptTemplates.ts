export interface PromptTemplate {
  id: string;
  title: string;
  category: string;
  prompt: string;
  builtIn?: boolean;
}

export const DEFAULT_PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'coding-fix',
    title: 'Fix My Code',
    category: 'Coding',
    prompt: 'Review this code, identify bugs, and provide a corrected version with a short explanation.',
    builtIn: true
  },
  {
    id: 'coding-refactor',
    title: 'Refactor For Readability',
    category: 'Coding',
    prompt: 'Refactor the following code for readability and maintainability without changing behavior.',
    builtIn: true
  },
  {
    id: 'writing-email',
    title: 'Professional Email',
    category: 'Writing',
    prompt: 'Draft a professional email with a clear subject, concise body, and polite closing.',
    builtIn: true
  },
  {
    id: 'analysis-proscons',
    title: 'Pros & Cons Analysis',
    category: 'Analysis',
    prompt: 'Provide a balanced pros-and-cons analysis and end with a recommendation.',
    builtIn: true
  },
  {
    id: 'learning-explain',
    title: 'Explain Like Teacher',
    category: 'Learning',
    prompt: 'Explain this topic step-by-step with simple examples and a short summary.',
    builtIn: true
  }
];
