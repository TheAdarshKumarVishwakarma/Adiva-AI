import type { Dispatch, SetStateAction } from 'react';
import { chatApi } from '@/features/chat/api/chatApi';
import { ImageProcessingService } from '@/services/imageProcessingService';
import { buildSystemPrompt, buildUserPrompt, detectChallenge, detectTaskType } from '@/features/chat/utils/prompts';
import { extractAnswerFromJsonLike, extractPlainAnswer, safeParse } from '@/features/chat/utils/parsing';
import type { Message, Personality } from '@/features/chat/types/chat';

interface UseAiResponseParams {
  selectedModel: string;
  currentChatId: string;
  personality: Personality;
  defensiveMode: boolean;
  setGuestLimit: (value: number | null) => void;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  trackAnalytics: (event: string, data?: any) => Promise<void>;
}

export const useAiResponse = ({
  selectedModel,
  currentChatId,
  personality,
  defensiveMode,
  setGuestLimit,
  setMessages,
  trackAnalytics
}: UseAiResponseParams) => {
  const callAIStream = async (systemPrompt: string, userPrompt: string, rawMessage: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await chatApi.streamChatMessage(token, {
        message: rawMessage,
        systemPrompt,
        userPrompt,
        conversationId: currentChatId,
        modelId: selectedModel
      });

      if (!response.ok) {
        let errorPayload: any = null;
        try {
          errorPayload = await response.json();
        } catch {
          // ignore
        }
        if (response.status === 401 && errorPayload?.code === 'GUEST_LOGIN_REQUIRED') {
          setGuestLimit(errorPayload?.limit || 5);
          window.dispatchEvent(new CustomEvent('auth-required', { detail: { limit: errorPayload?.limit || 5 } }));
        }
        throw new Error(`Streaming API call failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let usage: any = null;

      if (!reader) {
        throw new Error('No response body reader available');
      }

      return new Promise<string>((resolve, reject) => {
        const processStream = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                resolve(fullResponse);
                break;
              }

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (!line.startsWith('data: ')) continue;

                try {
                  const data = JSON.parse(line.slice(6));

                  if (data.type === 'content') {
                    fullResponse += data.content;
                    setMessages((prev) => {
                      const next = [...prev];
                      const lastMessage = next[next.length - 1];
                      if (lastMessage && lastMessage.sender === 'AI' && lastMessage.isStreaming) {
                        lastMessage.text = fullResponse;
                      }
                      return next;
                    });
                  } else if (data.type === 'done') {
                    usage = data.usage;
                    setMessages((prev) => {
                      const next = [...prev];
                      const lastMessage = next[next.length - 1];
                      if (lastMessage && lastMessage.sender === 'AI') {
                        lastMessage.isStreaming = false;
                      }
                      return next;
                    });

                    if (usage) {
                      trackAnalytics('tokens_used', { tokens: usage.total_tokens });
                    }

                    resolve(fullResponse);
                    return;
                  } else if (data.type === 'error') {
                    reject(new Error(data.content));
                    return;
                  }
                } catch {
                  // ignore malformed stream frames
                }
              }
            }
          } catch (streamError) {
            reject(streamError);
          }
        };

        processStream();
      });
    } catch (e) {
      trackAnalytics('error_occurred', { error: e instanceof Error ? e.message : 'Unknown error' });
      throw e;
    }
  };

  const callAIJSON = async (
    systemPrompt: string,
    userPrompt: string,
    rawMessage: string,
    useStreaming = true,
    regenerate = false
  ) => {
    try {
      if (useStreaming) {
        return await callAIStream(systemPrompt, userPrompt, rawMessage);
      }

      const token = localStorage.getItem('token');
      const response = await chatApi.sendChatMessage(token, {
        message: rawMessage,
        systemPrompt,
        userPrompt,
        conversationId: currentChatId,
        modelId: selectedModel,
        regenerate
      });

      if (!response.ok) {
        let errorPayload: any = null;
        let errorText = '';
        try {
          errorPayload = await response.json();
          errorText = JSON.stringify(errorPayload);
        } catch {
          errorText = await response.text();
        }
        if (response.status === 401 && errorPayload?.code === 'GUEST_LOGIN_REQUIRED') {
          setGuestLimit(errorPayload?.limit || 5);
          window.dispatchEvent(new CustomEvent('auth-required', { detail: { limit: errorPayload?.limit || 5 } }));
        }
        throw new Error(`AI API call failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (data && typeof data.reply === 'string') {
        return data.reply;
      }
      if (data && typeof data.response === 'string') {
        return data.response;
      }
      if (data && typeof data.message === 'string') {
        return data.message;
      }
      return 'I apologize, but I received an unexpected response format. Please try again.';
    } catch (e) {
      trackAnalytics('error_occurred', { error: e instanceof Error ? e.message : 'Unknown error' });
      return '';
    }
  };

  const generateCodingResponse = async (
    userMessage: string,
    _wantDefense: boolean,
    taskType: string,
    options?: { regenerate?: boolean }
  ) => {
    const regenerate = options?.regenerate === true;
    const guessLanguage = (text: string) => {
      const t = text.toLowerCase();
      if (t.includes('typescript') || t.includes('tsx')) return 'tsx';
      if (t.includes('react')) return 'tsx';
      if (t.includes('javascript') || t.includes('js') || t.includes('node')) return 'javascript';
      if (t.includes('python')) return 'python';
      if (t.includes('java')) return 'java';
      if (t.includes('c++')) return 'cpp';
      if (t.includes('c#')) return 'csharp';
      if (t.includes('php')) return 'php';
      if (t.includes('html')) return 'html';
      if (t.includes('css')) return 'css';
      if (t.includes('sql')) return 'sql';
      if (t.includes('go')) return 'go';
      if (t.includes('rust')) return 'rust';
      return '';
    };

    const ensureCodeFences = (response: string, langHint: string) => {
      if (!response || response.includes('```')) return response;
      const lines = response.split('\n');
      const codeLike = (line: string) =>
        /^\s*(def |class |function |const |let |var |import |from |#include|public |private |protected |using |package |SELECT |INSERT |UPDATE |DELETE |CREATE |DROP )/i.test(line) ||
        /[;{}]$/.test(line) ||
        /\(\)\s*{/.test(line);

      const firstCodeIndex = lines.findIndex(codeLike);
      if (firstCodeIndex === -1) return response;

      const intro = lines.slice(0, firstCodeIndex).join('\n').trim();
      const code = lines.slice(firstCodeIndex).join('\n').trim();
      const lang = langHint || '';

      if (!code) return response;
      if (intro) {
        return `${intro}\n\n\`\`\`${lang}\n${code}\n\`\`\``;
      }
      return `\`\`\`${lang}\n${code}\n\`\`\``;
    };

    const codingPrompt = `You are an expert programming assistant. Respond like ChatGPT:\n\n- Start with a short summary of the approach (1-3 sentences).\n- Provide the complete working code in a single code block with syntax highlighting.\n- Add a structured explanation after the code using headings like **How it works**, **Complexity**, **Notes**.\n- Include usage only if it helps clarity. Keep it short.\n- Use tasteful section icons/emojis (2-4 total) as cues, not on every line.\n\nUser Request: ${userMessage}`;

    try {
      const response = await callAIJSON(codingPrompt, userMessage, userMessage, false, regenerate);

      let formatted = response as string;
      try {
        const trimmed = formatted.trim();
        const jsonText = trimmed.startsWith('```') ? trimmed.replace(/```[\w-]*\n?|\n?```/g, '') : trimmed;
        if (jsonText.startsWith('{')) {
          const parsed = JSON.parse(jsonText);
          if (parsed && typeof parsed.answer === 'string') {
            formatted = parsed.answer + (parsed.defense ? `\n\nMethodology:\n${parsed.defense}` : '');
          }
        }
      } catch {
        // ignore
      }

      formatted = ensureCodeFences(formatted, guessLanguage(userMessage));
      return {
        text: formatted as string,
        meta: {
          defenseQuality: 'high' as const,
          hallucinationRisk: 'low' as const,
          tone: personality,
          taskType
        }
      };
    } catch {
      return {
        text: 'I apologize, but I encountered an error while generating the coding response. Please try again.',
        meta: {
          defenseQuality: 'low' as const,
          hallucinationRisk: 'low' as const,
          tone: personality,
          taskType
        }
      };
    }
  };

  const generateResponse = async (userMessage: string, options?: { regenerate?: boolean }) => {
    const regenerate = options?.regenerate === true;
    const wantDefense = defensiveMode || detectChallenge(userMessage);
    const taskType = detectTaskType(userMessage);

    if (taskType === 'coding') {
      return await generateCodingResponse(userMessage, wantDefense, taskType, { regenerate });
    }

    const sys = buildSystemPrompt(personality);
    const u1 = buildUserPrompt(userMessage, wantDefense, taskType);

    const raw1 = await callAIJSON(sys, u1, userMessage, false, regenerate);

    let draft: any;
    try {
      draft = JSON.parse(raw1 as string);
    } catch {
      const extracted = extractAnswerFromJsonLike(raw1 as string);
      if (extracted?.answer) {
        return {
          text: extracted.answer + (extracted.defense ? `\n\nMethodology:\n${extracted.defense}` : ''),
          meta: {
            defenseQuality: extracted.meta?.defense_quality || 'medium',
            hallucinationRisk: extracted.meta?.hallucination_risk || 'low',
            tone: extracted.meta?.tone || personality,
            taskType: extracted.meta?.task_type || taskType
          }
        };
      }

      return {
        text: extractPlainAnswer(raw1 as string),
        meta: {
          defenseQuality: 'medium' as const,
          hallucinationRisk: 'low' as const,
          tone: personality,
          taskType
        }
      };
    }

    if (!draft.answer) {
      return {
        text: "I'm here to help with any task! Whether you need coding help, writing assistance, analysis, math solutions, creative ideas, or educational guidance, I'm ready to assist. What would you like to work on?",
        meta: {
          defenseQuality: 'low' as const,
          hallucinationRisk: 'low' as const,
          tone: personality,
          taskType
        }
      };
    }

    let final = draft;
    if (wantDefense || taskType === 'analysis') {
      const critiquePrompt = `You wrote this response: ${JSON.stringify(draft)}\nImprove the response: make it more comprehensive, accurate, and helpful. For analysis, provide deeper insights. Return the SAME JSON shape only.`;
      const raw2 = await callAIJSON(sys, critiquePrompt, userMessage, false);
      const improved = safeParse<typeof draft>(raw2, draft);
      final = improved;
    }

    const finalText = [extractPlainAnswer(final.answer), final.defense ? `\n\nMethodology:\n${final.defense}` : ''].join('');

    return {
      text: finalText,
      meta: {
        defenseQuality: final.defense_quality,
        hallucinationRisk: final.hallucination_risk,
        tone: final.tone || personality,
        taskType: final.task_type || taskType
      }
    };
  };

  const generateResponseWithImage = async (
    userMessage: string,
    imageFile: File,
    options?: { signal?: AbortSignal }
  ) => {
    try {
      const response = await ImageProcessingService.processImage({
        image: imageFile,
        message: userMessage,
        systemPrompt: buildSystemPrompt(personality),
        conversationId: currentChatId,
        modelId: selectedModel,
        signal: options?.signal
      });

      return {
        text: response.reply,
        conversationId: response.conversationId,
        chatId: (response as any).chatId,
        title: (response as any).title,
        meta: {
          defenseQuality: 'medium' as const,
          hallucinationRisk: 'low' as const,
          tone: personality,
          taskType: 'image_analysis'
        }
      };
    } catch {
      return {
        text: 'Sorry, I encountered an error while processing the image. Please try again.',
        conversationId: currentChatId,
        meta: {
          defenseQuality: 'low' as const,
          hallucinationRisk: 'low' as const,
          tone: personality,
          taskType: 'image_analysis'
        }
      };
    }
  };

  return {
    generateResponse,
    generateResponseWithImage
  };
};
