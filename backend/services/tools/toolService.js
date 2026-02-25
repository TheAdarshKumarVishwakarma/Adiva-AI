import vm from 'node:vm';
import fetch from 'node-fetch';

const MAX_INPUT_LENGTH = 1000;
const ALLOWED_TOOLS = new Set(['web_search', 'calculator', 'code_runner']);

const ensureToolAllowed = (tool) => {
  if (!ALLOWED_TOOLS.has(tool)) {
    throw new Error(`Unsupported tool: ${tool}`);
  }
};

const requireInput = (input) => {
  if (typeof input !== 'string' || !input.trim()) {
    throw new Error('Tool input is required');
  }
  if (input.length > MAX_INPUT_LENGTH) {
    throw new Error(`Tool input too long (max ${MAX_INPUT_LENGTH} chars)`);
  }
  return input.trim();
};

const runCalculator = (rawInput) => {
  const expression = requireInput(rawInput);
  if (!/^[0-9+\-*/().,%\s]+$/.test(expression)) {
    throw new Error('Calculator only supports digits and basic operators');
  }

  const sandbox = {};
  const script = new vm.Script(`(${expression})`, { timeout: 500 });
  const result = script.runInNewContext(sandbox, { timeout: 500 });
  if (typeof result !== 'number' || Number.isNaN(result) || !Number.isFinite(result)) {
    throw new Error('Invalid calculation result');
  }
  return {
    tool: 'calculator',
    output: `Result: ${result}`
  };
};

const runWebSearch = async (rawInput) => {
  const query = encodeURIComponent(requireInput(rawInput));
  const response = await fetch(`https://api.duckduckgo.com/?q=${query}&format=json&no_redirect=1&skip_disambig=1`, {
    method: 'GET',
    headers: { Accept: 'application/json' }
  });
  if (!response.ok) {
    throw new Error(`Web search failed: ${response.status}`);
  }

  const data = await response.json();
  const abstract = typeof data?.AbstractText === 'string' ? data.AbstractText : '';
  const heading = typeof data?.Heading === 'string' ? data.Heading : '';
  const related = Array.isArray(data?.RelatedTopics) ? data.RelatedTopics : [];
  const firstTopic = related.find((item) => typeof item?.Text === 'string')?.Text || '';

  const summary = [heading, abstract || firstTopic].filter(Boolean).join('\n');
  return {
    tool: 'web_search',
    output: summary || 'No concise result found. Try a more specific query.',
    source: data?.AbstractURL || data?.Results?.[0]?.FirstURL || null
  };
};

const runCodeRunner = (rawInput) => {
  const code = requireInput(rawInput);
  const logs = [];
  const sandbox = {
    console: {
      log: (...args) => logs.push(args.map((a) => String(a)).join(' '))
    },
    Math,
    Date
  };

  const script = new vm.Script(code, { timeout: 1000 });
  const result = script.runInNewContext(sandbox, { timeout: 1000 });
  return {
    tool: 'code_runner',
    output: `Result: ${result === undefined ? 'undefined' : String(result)}${logs.length ? `\nLogs:\n${logs.join('\n')}` : ''}`
  };
};

export const executeTool = async ({ tool, input, user }) => {
  ensureToolAllowed(tool);
  switch (tool) {
    case 'calculator':
      return runCalculator(input);
    case 'web_search':
      return await runWebSearch(input);
    case 'code_runner':
      return runCodeRunner(input);
    default:
      throw new Error(`Unsupported tool: ${tool}`);
  }
};

export const supportedTools = Array.from(ALLOWED_TOOLS);
