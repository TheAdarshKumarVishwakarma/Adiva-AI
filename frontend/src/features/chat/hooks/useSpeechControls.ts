import { useEffect, useRef, useState } from 'react';

interface UseSpeechControlsParams {
  speechLanguage: string;
  setInputValue: React.Dispatch<React.SetStateAction<string>>;
}

export const useSpeechControls = ({ speechLanguage, setInputValue }: UseSpeechControlsParams) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [speechVoices, setSpeechVoices] = useState<SpeechSynthesisVoice[]>([]);
  const listeningBaseRef = useRef('');
  const ttsSessionRef = useRef(0);
  const ttsQueueRef = useRef<string[]>([]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SR();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = speechLanguage || 'en-US';
      recognitionRef.current.onresult = (e: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const piece = e.results[i][0]?.transcript || '';
          if (e.results[i].isFinal) {
            finalTranscript += piece;
          } else {
            interimTranscript += piece;
          }
        }
        const merged = `${listeningBaseRef.current}${finalTranscript}${interimTranscript}`.trim();
        setInputValue(merged);
      };
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, [speechLanguage, setInputValue]);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const loadVoices = () => {
      setSpeechVoices(window.speechSynthesis.getVoices());
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const getVoiceForLanguage = (lang: string) => {
    if (!speechVoices.length) return undefined;
    const exact = speechVoices.find((v) => v.lang === lang);
    if (exact) return exact;
    const prefix = speechVoices.find((v) => v.lang.startsWith(lang.split('-')[0]));
    return prefix || speechVoices[0];
  };

  const splitTextIntoChunks = (text: string): string[] => {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (!normalized) return [];
    const sentenceChunks = normalized
      .split(/(?<=[.!?])\s+/)
      .map((chunk) => chunk.trim())
      .filter(Boolean);
    if (sentenceChunks.length) return sentenceChunks;

    const fallback: string[] = [];
    for (let i = 0; i < normalized.length; i += 220) {
      fallback.push(normalized.slice(i, i + 220));
    }
    return fallback;
  };

  const stopSpeaking = () => {
    ttsSessionRef.current += 1;
    ttsQueueRef.current = [];
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const speakNextChunk = (sessionId: number, targetLang: string) => {
    if (sessionId !== ttsSessionRef.current) return;
    const nextChunk = ttsQueueRef.current.shift();
    if (!nextChunk) {
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(nextChunk);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 0.9;
    utterance.lang = targetLang;
    const voice = getVoiceForLanguage(targetLang);
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => {
      if (sessionId === ttsSessionRef.current) {
        setIsSpeaking(true);
      }
    };
    utterance.onend = () => {
      if (sessionId === ttsSessionRef.current) {
        speakNextChunk(sessionId, targetLang);
      }
    };
    utterance.onerror = () => {
      if (sessionId === ttsSessionRef.current) {
        setIsSpeaking(false);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const speakText = (text: string, language?: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in your browser');
      return;
    }

    try {
      const targetLang = language || speechLanguage;
      const chunks = splitTextIntoChunks(text);
      if (!chunks.length) return;
      stopSpeaking();
      const sessionId = ttsSessionRef.current;
      ttsQueueRef.current = [...chunks];
      setIsSpeaking(true);
      speakNextChunk(sessionId, targetLang);
    } catch {
      setIsSpeaking(false);
      alert('Error starting speech synthesis');
    }
  };

  const startVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser');
      return;
    }
    try {
      stopSpeaking();
      setInputValue((prev) => {
        listeningBaseRef.current = prev ? `${prev} ` : '';
        return prev;
      });
      recognitionRef.current.lang = speechLanguage || 'en-US';
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  };

  const stopVoiceInput = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {
      // no-op: recognition may already be stopped
    }
    setIsListening(false);
  };

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser');
      return;
    }
    if (isListening) {
      stopVoiceInput();
    } else {
      startVoiceInput();
    }
  };

  return {
    isListening,
    isSpeaking,
    startVoiceInput,
    stopVoiceInput,
    toggleVoiceInput,
    speakText,
    stopSpeaking
  };
};
