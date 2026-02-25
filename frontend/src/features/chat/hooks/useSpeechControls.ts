import { useEffect, useRef, useState } from 'react';

interface UseSpeechControlsParams {
  speechLanguage: string;
  setInputValue: (value: string) => void;
}

export const useSpeechControls = ({ speechLanguage, setInputValue }: UseSpeechControlsParams) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [speechVoices, setSpeechVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SR();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = speechLanguage || 'en-US';
      recognitionRef.current.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        setInputValue(transcript);
        setIsListening(false);
      };
      recognitionRef.current.onerror = () => setIsListening(false);
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

  const speakText = (text: string, language?: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in your browser');
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.volume = 0.9;
      const targetLang = language || speechLanguage;
      utterance.lang = targetLang;
      const voice = getVoiceForLanguage(targetLang);
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (event) => {
        setIsSpeaking(false);
        alert(`Speech error: ${event.error}`);
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
      alert('Error starting speech synthesis');
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  return {
    isListening,
    isSpeaking,
    toggleVoiceInput,
    speakText,
    stopSpeaking
  };
};
