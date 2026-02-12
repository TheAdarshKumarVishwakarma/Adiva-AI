AI MODEL & API KEY CHANGE GUIDE
===============================

This project uses OpenAI and Claude models through a backend router.
This file explains EXACTLY where to change things when:

1. API key changes
2. OpenAI model changes
3. Default model changes
4. Old models are disabled (commented)
5. New models are added

--------------------------------
1. WHEN API KEY CHANGES
--------------------------------

FILE: .env

Change ONLY this line:

OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx

Example:

OLD:
OPENAI_API_KEY=sk-old-key-123

NEW:
OPENAI_API_KEY=sk-new-key-456

DO NOT change:
- frontend code
- routes
- model logic
- OpenAI client initialization

This code NEVER changes:

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

--------------------------------
2. WHERE MODELS ARE DEFINED
--------------------------------

FILE: routes/aiModels.js

All models live inside the AI_MODELS object.

Example:

const AI_MODELS = {
  'gpt-5-nano': {
    name: 'Adiva-5.0-Nano',
    provider: 'OpenAI',
    maxTokens: 8192,
    costPer1kTokens: 0.00005,
    description: 'Ultra-fast GPT-5 Nano',
    capabilities: ['text-generation', 'conversation']
  }
};

Endpoints that AUTO-USE this:
- GET /api/ai-models
- GET /api/ai-models/:id
- GET /api/ai-models/capabilities

--------------------------------
3. HOW TO ADD A NEW MODEL
--------------------------------

Add a new entry inside AI_MODELS:

Example: Adding GPT-5 Mini

'gpt-5-mini': {
  name: 'Adiva-5.0-Mini',
  provider: 'OpenAI',
  maxTokens: 16384,
  costPer1kTokens: 0.00008,
  description: 'Balanced GPT-5 Mini model',
  capabilities: ['text-generation', 'conversation']
}

NO frontend changes required.

--------------------------------
4. HOW TO CHANGE DEFAULT MODEL
--------------------------------

FILE: routes/aiModels.js

Find this line in /generate route:

const {
  modelId = 'gpt-5-nano',
  messages,
  ...
} = req.body;

Change ONLY the default value:

Example:

OLD:
modelId = 'gpt-5-nano'

NEW:
modelId = 'gpt-5-mini'

Frontend stays unchanged.

--------------------------------
5. HOW GPT-5 IS CALLED (IMPORTANT)
--------------------------------

GPT-5 models DO NOT use chat.completions.

They use the Responses API:

if (modelId.startsWith('gpt-5')) {
  const response = await openai.responses.create({
    model: modelId,
    input: messageArray
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n'),
    temperature,
    max_output_tokens: maxTokens,
  });

  aiResponse = response.output_text;
  usage = response.usage;
}

If OpenAI releases GPT-6:

Change ONE line:

if (modelId.startsWith('gpt-5') || modelId.startsWith('gpt-6')) {

--------------------------------
6. HOW TO DISABLE (BUT KEEP) A MODEL
--------------------------------

Comment it out in AI_MODELS.

Example:

/*
'gpt-4o-mini': {
  name: 'Adiva-2.0-Mini',
  provider: 'OpenAI',
  ...
},
*/

This:
- removes it from the API
- keeps code for rollback
- does NOT affect frontend

--------------------------------
7. FRONTEND RULE (VERY IMPORTANT)
--------------------------------

Frontend NEVER needs to change unless:

- it hardcodes a removed modelId
- example: "gpt-4o-mini"

Fix by changing ONLY the string:

OLD:
modelId: "gpt-4o-mini"

NEW:
modelId: "gpt-5-nano"

Request shape NEVER changes.

--------------------------------
8. QUICK CHECKLIST
--------------------------------

API key changed?
→ Edit .env only

New OpenAI model?
→ Add to AI_MODELS

Default model change?
→ Change modelId default value

GPT version change?
→ Update ONE if condition

Frontend broken?
→ Check hardcoded modelId

--------------------------------
END OF FILE
--------------------------------
