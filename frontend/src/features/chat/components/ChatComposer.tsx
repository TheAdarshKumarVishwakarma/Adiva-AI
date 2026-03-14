import React, { useEffect, useRef, useState } from 'react';
import { Send, Mic, MicOff, Camera, Library, Wrench, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import type { ThemeOption } from '@/features/chat/types/chat';

interface ChatComposerProps {
  showAnalytics: boolean;
  isAuthenticated: boolean;
  guestLimit: number | null;
  isTyping: boolean;
  isUploadingImage: boolean;
  inputValue: string;
  selectedImage: File | null;
  imagePreview: string | null;
  selectedModel: string;
  isListening: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  getCurrentTheme: () => ThemeOption;
  setInputValue: (value: string) => void;
  setShowShortcuts: (show: boolean) => void;
  openPromptTemplates: () => void;
  openToolActions: () => void;
  setShowImagePopup: (show: boolean) => void;
  handleImageRemove: () => void;
  handleImageSelect: (file: File) => void;
  handleKeyPress: (e: React.KeyboardEvent) => void;
  toggleVoiceInput: () => void;
  startVoiceInput: () => void;
  stopVoiceInput: () => void;
  handleSendMessage: () => void;
}

export default function ChatComposer({
  showAnalytics,
  isAuthenticated,
  guestLimit,
  isTyping,
  isUploadingImage,
  inputValue,
  selectedImage,
  imagePreview,
  selectedModel,
  isListening,
  inputRef,
  getCurrentTheme,
  setInputValue,
  setShowShortcuts,
  openPromptTemplates,
  openToolActions,
  setShowImagePopup,
  handleImageRemove,
  handleImageSelect,
  handleKeyPress,
  toggleVoiceInput,
  startVoiceInput,
  stopVoiceInput,
  handleSendMessage
}: ChatComposerProps) {
  const [showActionMenu, setShowActionMenu] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  const [isMultiline, setIsMultiline] = useState(false);
  const shouldStackActions = inputValue.trim().length > 0 || isMultiline;

  useEffect(() => {
    if (!showActionMenu) return;
    const handleOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setShowActionMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showActionMenu]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const style = window.getComputedStyle(el);
    const lineHeight = Number.parseFloat(style.lineHeight || '0') || 24;
    const paddingTop = Number.parseFloat(style.paddingTop || '0') || 0;
    const paddingBottom = Number.parseFloat(style.paddingBottom || '0') || 0;
    const singleLineHeight = lineHeight + paddingTop + paddingBottom;
    const isMulti = el.scrollHeight > singleLineHeight + 2;
    setIsMultiline(isMulti);
  }, [inputValue, inputRef]);

  if (showAnalytics) return null;

  return (
    <div className="p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        {!isAuthenticated && guestLimit !== null && (
          <div className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 backdrop-blur-xl px-4 py-3 text-amber-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-lg">
            <div className="text-sm">
              <span className="font-semibold">Guest limit reached.</span>{' '}
              You can send up to {guestLimit} messages without logging in.
            </div>
            <Button
              size="sm"
              className="h-9 px-4 bg-amber-400/20 hover:bg-amber-400/30 text-amber-100 border border-amber-300/30 rounded-lg"
              onClick={() => window.dispatchEvent(new CustomEvent('auth-required', { detail: { limit: guestLimit } }))}
            >
              Sign in to continue
            </Button>
          </div>
        )}

        <div className="relative">
          <div className={`flex ${shouldStackActions ? 'flex-col items-stretch' : 'items-end'} gap-2 sm:gap-3 p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-xl transition-all duration-300 focus-within:border-white/20 focus-within:shadow-2xl ring-1 ring-white/5 chat-input-dock`}>
            <div className="flex-1 min-h-[48px] flex flex-col">
              {imagePreview && (
                <div className="mb-2 p-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg w-fit">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-blue-300 flex items-center gap-1">
                      <span className="text-xs">IMG</span>
                      Image:
                    </span>
                    <Button
                      onClick={handleImageRemove}
                      size="sm"
                      className="h-4 w-4 p-0 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-400/30 transition-all duration-200 hover:scale-110"
                      disabled={isUploadingImage}
                    >
                      <span className="text-xs">x</span>
                    </Button>
                  </div>
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-w-32 max-h-16 rounded object-cover shadow-sm cursor-pointer hover:opacity-80 transition-opacity duration-200"
                      onClick={() => setShowImagePopup(true)}
                      title="Click to view full size"
                    />
                    {isUploadingImage && (
                      <div className="absolute inset-0 bg-black/60 rounded flex items-center justify-center">
                        <div className="flex flex-col items-center gap-1 text-white">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span className="text-xs">Processing...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {imagePreview && !selectedModel.startsWith('claude-') && (
                <div className="mb-2 text-[11px] text-blue-300/80">
                  Tip: For image analysis, choose a Adiva 4.0 Sonnet model in Settings.
                </div>
              )}

              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={selectedImage ? 'Describe what you want to know about this image...' : 'Message Adiva AI...'}
                className="w-full bg-transparent border-0 text-white text-sm sm:text-base placeholder:text-white/60 focus:ring-0 focus:outline-none resize-none min-h-[24px] max-h-[180px] py-2 sm:py-3 px-1 leading-relaxed break-words"
                style={{
                  '--tw-ring-color': 'transparent',
                  lineHeight: '1.5'
                } as React.CSSProperties}
                rows={1}
              />
            </div>

            <div ref={actionMenuRef} className={`flex items-center gap-1.5 sm:gap-2 shrink-0 relative ${shouldStackActions ? 'w-full justify-end pt-1' : ''}`}>
              <Tooltip content="More">
                <Button
                  onClick={() => setShowActionMenu((prev) => !prev)}
                  disabled={isTyping || isUploadingImage}
                  size="sm"
                  className="h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-full transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: 'rgba(255, 255, 255, 0.7)'
                  }}
                  aria-expanded={showActionMenu}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </Tooltip>
              {showActionMenu && (
                <div className="absolute bottom-11 right-0 z-20 flex flex-col gap-2 rounded-2xl border border-white/15 bg-slate-900/90 backdrop-blur-xl p-2 shadow-xl">
                  <Button
                    onClick={() => { openPromptTemplates(); setShowActionMenu(false); }}
                    disabled={isTyping || isUploadingImage}
                    size="sm"
                    className="h-8 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20"
                  >
                    <Library className="h-4 w-4 mr-2" />
                    Templates
                  </Button>
                  <Button
                    onClick={() => { openToolActions(); setShowActionMenu(false); }}
                    disabled={isTyping || isUploadingImage}
                    size="sm"
                    className="h-8 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20"
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    Tools
                  </Button>
                </div>
              )}

              <Tooltip content="Keyboard Shortcuts (Ctrl+?)">
                <Button
                  onClick={() => setShowShortcuts(true)}
                  disabled={isTyping || isUploadingImage}
                  size="sm"
                  className="hidden sm:inline-flex h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-full transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: 'rgba(255, 255, 255, 0.7)'
                  }}
                  title="Keyboard Shortcuts"
                >
                  <span className="text-xs">?</span>
                </Button>
              </Tooltip>

              <Tooltip content={selectedImage ? 'Change Image' : 'Upload Image'}>
                <Button
                  onClick={() => document.getElementById('image-upload')?.click()}
                  disabled={isTyping || isUploadingImage}
                  size="sm"
                  className="h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-full transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: selectedImage
                      ? 'linear-gradient(135deg, #10b981, #059669)'
                      : isUploadingImage
                        ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                        : 'rgba(255, 255, 255, 0.1)',
                    border: selectedImage || isUploadingImage ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
                    color: 'white'
                  }}
                >
                  {isUploadingImage ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <Camera className="w-3 h-3" />
                    )}
                </Button>
              </Tooltip>

              <input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (!file.type.startsWith('image/')) {
                      alert('Please select a valid image file');
                      return;
                    }

                    if (file.size > 10 * 1024 * 1024) {
                      alert('Image size must be less than 10MB');
                      return;
                    }

                    handleImageSelect(file);
                  }
                }}
                className="hidden"
                disabled={isTyping || isUploadingImage}
              />

              <Tooltip content="Push to talk (hold), click to toggle">
                <Button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    startVoiceInput();
                  }}
                  onMouseUp={(e) => {
                    e.preventDefault();
                    stopVoiceInput();
                  }}
                  onMouseLeave={() => {
                    if (isListening) stopVoiceInput();
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    startVoiceInput();
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    stopVoiceInput();
                  }}
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    // Keyboard activation produces detail 0; mouse click is already handled by hold events.
                    if (e.detail === 0) toggleVoiceInput();
                  }}
                  disabled={isTyping}
                  size="sm"
                  className="h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-full transition-all duration-200 hover:scale-110"
                  style={{
                    background: isListening
                      ? 'linear-gradient(135deg, #ef4444, #ec4899)'
                      : 'rgba(255, 255, 255, 0.1)',
                    border: isListening ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
                    color: isListening ? 'white' : 'rgba(255, 255, 255, 0.7)'
                  }}
                  aria-pressed={isListening}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              </Tooltip>

              <Button
                onClick={() => {
                  setShowActionMenu(false);
                  handleSendMessage();
                }}
                disabled={(!inputValue.trim() && !selectedImage) || isTyping || isUploadingImage}
                size="sm"
                className="h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-full transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: (!inputValue.trim() && !selectedImage) || isTyping || isUploadingImage
                    ? 'rgba(255, 255, 255, 0.1)'
                    : `linear-gradient(135deg, ${getCurrentTheme().primaryColor}, ${getCurrentTheme().secondaryColor})`,
                  border: 'none',
                  color: 'white'
                }}
                aria-label="Send message"
              >
                {isUploadingImage ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
