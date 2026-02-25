import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { motion } from 'framer-motion';
import { User as UserIcon, Copy, Check, Pencil, Send as SendIcon, RotateCcw, ThumbsUp, ThumbsDown, Volume2, VolumeX, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { LanguageOption, Message, ThemeOption } from '@/features/chat/types/chat';
import LogoMark from '@/shared/components/LogoMark';
import LogoLoader from '@/shared/components/LogoLoader';

interface ChatMessageListProps {
  messages: Message[];
  messagesScrollRef: React.RefObject<HTMLDivElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  handleMessagesScroll: () => void;
  getCurrentTheme: () => ThemeOption;
  editingMessage: string | null;
  editText: string;
  setEditText: (value: string) => void;
  saveEditedMessage: () => void;
  cancelEdit: () => void;
  expandedMessageIds: Set<string>;
  toggleExpandMessage: (messageId: string) => void;
  copiedCodeKey: string | null;
  copyCodeBlock: (codeText: string) => Promise<void>;
  extractTextFromNode: (node: React.ReactNode) => string;
  copiedMessageId: string | null;
  copyMessageById: (messageId: string) => Promise<void>;
  regeneratingMessageId: string | null;
  regenerateMessage: (messageId: string) => Promise<void>;
  showPreviousResponse: (messageId: string) => void;
  showNextResponse: (messageId: string) => void;
  likeMessage: (messageId: string) => void;
  dislikeMessage: (messageId: string) => void;
  editMessage: (messageId: string, text: string) => void;
  speechEnabled: boolean;
  availableLanguages: LanguageOption[];
  speechLanguage: string;
  isSpeaking: boolean;
  stopSpeaking: () => void;
  speakText: (text: string, language?: string) => void;
  error: string | null;
  handleSendMessage: () => Promise<void>;
  isTyping: boolean;
  retryCount: number;
}

export default function ChatMessageList({
  messages,
  messagesScrollRef,
  messagesEndRef,
  handleMessagesScroll,
  getCurrentTheme,
  editingMessage,
  editText,
  setEditText,
  saveEditedMessage,
  cancelEdit,
  expandedMessageIds,
  toggleExpandMessage,
  copiedCodeKey,
  copyCodeBlock,
  extractTextFromNode,
  copiedMessageId,
  copyMessageById,
  regeneratingMessageId,
  regenerateMessage,
  showPreviousResponse,
  showNextResponse,
  likeMessage,
  dislikeMessage,
  editMessage,
  speechEnabled,
  availableLanguages,
  speechLanguage,
  isSpeaking,
  stopSpeaking,
  speakText,
  error,
  handleSendMessage,
  isTyping,
  retryCount
}: ChatMessageListProps) {
  const MarkdownRenderer = ({ content, isStreaming }: { content: string; isStreaming?: boolean }) => {
    if (content === 'Thinking' && isStreaming) {
      return (
        <div className="flex items-center space-x-3">
          <div className="flex space-x-1">
            <div className="w-2 h-2 rounded-full animate-bounce" style={{ animationDelay: '0ms', backgroundColor: getCurrentTheme().primaryColor }}></div>
            <div className="w-2 h-2 rounded-full animate-bounce" style={{ animationDelay: '150ms', backgroundColor: getCurrentTheme().secondaryColor }}></div>
            <div className="w-2 h-2 rounded-full animate-bounce" style={{ animationDelay: '300ms', backgroundColor: getCurrentTheme().accentColor }}></div>
          </div>
        </div>
      );
    }

    return (
      <div className="prose prose-invert max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            code: ({ className, children, ...props }: any) => {
              const inline = !className?.includes('language-');
              const match = /language-(\w+)/.exec(className || '');
              const language = match ? match[1] : '';

              if (!inline && language) {
                return (
                  <div className="relative my-4">
                    <div className="flex items-center justify-between bg-gray-800 px-4 py-2 rounded-t-lg border-b border-gray-700">
                      <span className="text-sm text-gray-300 font-medium">{language}</span>
                      <Button
                        size="sm"
                        onClick={() => copyCodeBlock(extractTextFromNode(children).replace(/\n$/, ''))}
                        className="h-6 px-2 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 border-0"
                      >
                        {copiedCodeKey === extractTextFromNode(children).replace(/\n$/, '') ? (
                          <><Check className="h-3 w-3 mr-1" />Copied</>
                        ) : (
                          <><Copy className="h-3 w-3 mr-1" />Copy</>
                        )}
                      </Button>
                    </div>
                    <pre className="bg-gray-900 rounded-b-lg overflow-x-auto">
                      <code className={className} {...props}>{children}</code>
                    </pre>
                  </div>
                );
              }

              return (
                <code className="bg-gray-800 text-gray-200 px-1 py-0.5 rounded text-sm" {...props}>{children}</code>
              );
            },
            pre: ({ children }) => <div className="my-4">{children}</div>,
            blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-300 my-4">{children}</blockquote>,
            table: ({ children }) => <div className="overflow-x-auto my-4"><table className="min-w-full border border-gray-700 rounded-lg overflow-hidden">{children}</table></div>,
            th: ({ children }) => <th className="bg-gray-800 px-4 py-2 text-left text-sm font-medium text-gray-200 border-b border-gray-700">{children}</th>,
            td: ({ children }) => <td className="px-4 py-2 text-sm text-gray-300 border-b border-gray-700">{children}</td>,
            a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">{children}</a>,
            h1: ({ children }) => <h1 className="text-2xl font-bold text-white mt-6 mb-4 first:mt-0">{children}</h1>,
            h2: ({ children }) => <h2 className="text-xl font-bold text-white mt-5 mb-3">{children}</h2>,
            h3: ({ children }) => <h3 className="text-lg font-semibold text-white mt-4 mb-2">{children}</h3>,
            ul: ({ children }) => <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>,
            li: ({ children }) => <li className="text-gray-300">{children}</li>,
            p: ({ children }) => (
              <p className="my-2 leading-relaxed">
                {children}
                {isStreaming}
              </p>
            )
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <div ref={messagesScrollRef} onScroll={handleMessagesScroll} className="h-full overflow-y-auto p-4 sm:p-8 relative">
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 chat-stream">
        {messages.map((m) => {
          const isAssistantMessage = m.sender === 'AI' || m.isAI;
          const isRegeneratingThisMessage = isAssistantMessage && regeneratingMessageId === m.id;
          const versions = Array.isArray(m.responseVersions) ? m.responseVersions : [];
          const hasVersions = isAssistantMessage && versions.length > 1;
          const activeVersionIndex = hasVersions
            ? Math.max(0, Math.min(typeof m.activeResponseIndex === 'number' ? m.activeResponseIndex : versions.length - 1, versions.length - 1))
            : 0;
          const activeText = hasVersions ? versions[activeVersionIndex] : m.text;
          return (
            <div key={m.id} className={cn('relative overflow-visible flex gap-3 sm:gap-6 items-start group', m.sender === 'user' ? 'justify-end' : 'justify-start')}>
              {isAssistantMessage && (
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ai-glow bg-white/5 border border-white/15">
                  <LogoMark className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className={cn('max-w-[92%] sm:max-w-[75%] p-4 sm:p-6 rounded-2xl text-sm sm:text-base relative shadow-lg message-bubble-ai chat-bubble-neo chat-card group', editingMessage === m.id ? 'w-full' : '', m.sender === 'user' ? 'chat-card-user text-white rounded-br-md' : 'chat-card-ai text-white rounded-bl-md')}
              >
                {m.imageUrl && (
                  <div className="mb-4">
                    <img src={m.imageUrl} alt="User uploaded image" className="max-w-full max-h-64 rounded-lg object-cover shadow-lg" />
                  </div>
                )}

                {editingMessage === m.id ? (
                  <div className="space-y-3 w-full">
                    <textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="w-full min-h-[180px] p-4 bg-black/30 border border-white/20 rounded-xl text-white resize-none focus:outline-none focus:ring-2 focus:ring-white/20" rows={5} autoFocus />
                    <div className="flex items-center justify-end gap-2">
                      <Tooltip content="Send"><Button size="sm" onClick={saveEditedMessage} className="h-8 w-8 p-0 rounded-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-400/30"><SendIcon className="h-4 w-4" /></Button></Tooltip>
                      <Tooltip content="Cancel"><Button size="sm" onClick={cancelEdit} className="h-8 w-8 p-0 rounded-full bg-gray-500/20 hover:bg-gray-500/30 text-gray-200 border border-gray-400/30">x</Button></Tooltip>
                    </div>
                  </div>
                ) : (
                  <div className="leading-relaxed">
                    {isAssistantMessage ? (
                      (() => {
                        const shouldCollapse = !m.isStreaming && activeText && activeText.length > 1200;
                        const isExpanded = expandedMessageIds.has(m.id);
                        const visibleText = shouldCollapse && !isExpanded ? `${activeText.slice(0, 1200)}\n\n...` : activeText;

                        return (
                          <>
                            <MarkdownRenderer content={visibleText} isStreaming={m.isStreaming} />
                            {m.isStreaming && isRegeneratingThisMessage && (
                              <div className="mt-3 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2">
                                <div className="flex items-center gap-2 text-cyan-200 text-xs font-medium">
                                  <LogoLoader sizeClassName="h-3.5 w-3.5" />
                                  Regenerating response...
                                </div>
                                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                                  <div className="regen-progress-fill h-full rounded-full bg-cyan-300/80"></div>
                                </div>
                              </div>
                            )}
                            {shouldCollapse && !m.isStreaming && (
                              <div className="mt-2">
                                <Button size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleExpandMessage(m.id); }} className="h-7 px-3 bg-white/5 hover:bg-white/10 text-white border border-white/20 rounded-lg transition-all duration-200">
                                  {isExpanded ? 'Show less' : 'Show more'}
                                </Button>
                              </div>
                            )}
                          </>
                        );
                      })()
                    ) : (
                      <div className="whitespace-pre-line">{m.text}</div>
                    )}
                  </div>
                )}

                {isAssistantMessage && !m.isStreaming && (
                  <div className="mt-3 pt-2 border-t border-white/10 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {hasVersions && (
                      <div className="flex items-center gap-1 mr-1">
                        <Tooltip content="Previous"><Button size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); showPreviousResponse(m.id); }} className="h-7 w-7 p-0 bg-white/5 hover:bg-white/10 text-white border border-white/20 rounded-lg transition-all duration-200" disabled={activeVersionIndex === 0}><ChevronLeft className="h-4 w-4" /></Button></Tooltip>
                        <span className="text-[11px] text-blue-200 px-1 min-w-[44px] text-center">{activeVersionIndex + 1}/{versions.length}</span>
                        <Tooltip content="Next"><Button size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); showNextResponse(m.id); }} className="h-7 w-7 p-0 bg-white/5 hover:bg-white/10 text-white border border-white/20 rounded-lg transition-all duration-200" disabled={activeVersionIndex === versions.length - 1}><ChevronRight className="h-4 w-4" /></Button></Tooltip>
                      </div>
                    )}
                    <Tooltip content={copiedMessageId === m.id ? 'Copied' : 'Copy'}><Button size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); copyMessageById(m.id); }} className="h-7 w-7 p-0 bg-white/5 hover:bg-white/10 text-white border border-white/20 rounded-lg transition-all duration-200">{copiedMessageId === m.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button></Tooltip>
                    <Tooltip content={regeneratingMessageId === m.id ? 'Regenerating...' : 'Regenerate'}><Button size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); regenerateMessage(m.id); }} className="h-7 w-7 p-0 bg-white/5 hover:bg-white/10 text-white border border-white/20 rounded-lg transition-all duration-200" disabled={regeneratingMessageId === m.id}><RotateCcw className="h-4 w-4" /></Button></Tooltip>
                    <Tooltip content="Like"><Button size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); likeMessage(m.id); }} className={`h-7 w-7 p-0 border rounded-lg transition-all duration-200 ${m.liked ? 'bg-green-500/20 text-green-200 border-green-400/30' : 'bg-white/5 hover:bg-white/10 text-white border-white/20'}`}><ThumbsUp className="h-4 w-4" /></Button></Tooltip>
                    <Tooltip content="Dislike"><Button size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); dislikeMessage(m.id); }} className={`h-7 w-7 p-0 border rounded-lg transition-all duration-200 ${m.disliked ? 'bg-red-500/20 text-red-200 border-red-400/30' : 'bg-white/5 hover:bg-white/10 text-white border-white/20'}`}><ThumbsDown className="h-4 w-4" /></Button></Tooltip>
                  </div>
                )}

                {!isAssistantMessage && !m.isStreaming && editingMessage !== m.id && (
                  <div className="mt-3 pt-2 border-t border-white/10 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Tooltip content="Edit"><Button size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); editMessage(m.id, m.text); }} className="h-7 w-7 p-0 bg-white/5 hover:bg-white/10 text-white border border-white/20 rounded-full transition-all duration-200 flex items-center justify-center"><Pencil className="h-3.5 w-3.5" /></Button></Tooltip>
                  </div>
                )}

                {m.isAI && m.meta?.defenseQuality && !m.isStreaming && (
                  <div className="mt-4 text-sm text-blue-300 border-t border-white/20 pt-4">
                    <span>Tone: {m.meta?.tone || 'default'}</span><span className="mx-3">|</span>
                    <span>Defense: {m.meta.defenseQuality}</span><span className="mx-3">|</span>
                    <span>Risk: {m.meta.hallucinationRisk}</span>
                    {m.meta.taskType && (<><span className="mx-3">|</span><span>Task: {m.meta.taskType}</span></>)}
                  </div>
                )}

                {isAssistantMessage && speechEnabled && !m.isStreaming && (
                  <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-blue-300">Language: {availableLanguages.find((l) => l.code === speechLanguage)?.name.split(' ')[0] || 'EN'}</span>
                      <span className="text-xs text-blue-300">|</span>
                      <span className="text-xs text-blue-300">Status: {isSpeaking ? 'Speaking' : 'Ready'}</span>
                    </div>
                    {isSpeaking ? (
                      <Button
                        size="sm"
                        onClick={stopSpeaking}
                        className="h-9 px-3.5 bg-red-500/20 hover:bg-red-500/30 text-red-100 border border-red-400/30 rounded-xl transition-all duration-200 inline-flex items-center gap-2"
                      >
                        <span className="h-2 w-2 rounded-full bg-red-300 animate-pulse" />
                        <VolumeX className="h-4 w-4" />
                        <span className="text-xs font-medium">Stop</span>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => speakText(activeText, speechLanguage)}
                        className="h-9 px-3.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-100 border border-cyan-400/35 rounded-xl transition-all duration-200 inline-flex items-center gap-2"
                      >
                        <Volume2 className="h-4 w-4" />
                        <span className="text-xs font-medium">Speak</span>
                      </Button>
                    )}
                  </div>
                )}
              </motion.div>

              {m.sender === 'user' && (
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 ai-glow">
                  <UserIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
              )}
            </div>
          );
        })}

        {error && (
          <div className="flex items-center gap-3 text-sm text-red-300 bg-red-500/20 border border-red-400/30 p-4 rounded-xl">
            <span>Warning: {error}</span>
            <Button size="sm" className="h-8 px-4 bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-400/30 rounded-lg transition-all duration-200" onClick={handleSendMessage} disabled={isTyping || retryCount > 2}>
              Retry
            </Button>
          </div>
        )}
      </div>
      <div ref={messagesEndRef} />
    </div>
  );
}
