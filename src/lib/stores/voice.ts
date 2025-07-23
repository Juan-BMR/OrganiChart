import { writable } from 'svelte/store';

export interface VoiceState {
  isListening: boolean;
  isSupported: boolean;
  isSpeaking: boolean;
  transcript: string;
  error: string | null;
}

export const voiceState = writable<VoiceState>({
  isListening: false,
  isSupported: false,
  isSpeaking: false,
  transcript: '',
  error: null,
});

let recognition: SpeechRecognition | null = null;
let synthesis: SpeechSynthesis | null = null;

export function initializeVoice() {
  if (typeof window === 'undefined') return;

  // Check for Speech Recognition support
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      voiceState.update(state => ({ ...state, isListening: true, error: null }));
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      voiceState.update(state => ({
        ...state,
        transcript: finalTranscript || interimTranscript,
      }));
    };

    recognition.onend = () => {
      voiceState.update(state => ({ ...state, isListening: false }));
    };

    recognition.onerror = (event) => {
      voiceState.update(state => ({
        ...state,
        isListening: false,
        error: `Speech recognition error: ${event.error}`,
      }));
    };
  }

  // Check for Speech Synthesis support
  if ('speechSynthesis' in window) {
    synthesis = window.speechSynthesis;
  }

  voiceState.update(state => ({
    ...state,
    isSupported: !!(recognition && synthesis),
  }));
}

export function startListening(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!recognition) {
      reject(new Error('Speech recognition not supported'));
      return;
    }

    voiceState.update(state => ({ ...state, transcript: '', error: null }));

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      const currentTranscript = finalTranscript || interimTranscript;
      voiceState.update(state => ({ ...state, transcript: currentTranscript }));

      if (finalTranscript) {
        voiceState.update(state => ({ ...state, isListening: false }));
        resolve(finalTranscript.trim());
      }
    };

    recognition.onerror = (event) => {
      voiceState.update(state => ({
        ...state,
        isListening: false,
        error: `Speech recognition error: ${event.error}`,
      }));
      reject(new Error(event.error));
    };

    recognition.start();
  });
}

export function stopListening() {
  if (recognition) {
    recognition.stop();
  }
  voiceState.update(state => ({ ...state, isListening: false }));
}

export function speakText(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!synthesis) {
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    // Stop any ongoing speech
    synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;

    // Try to use a natural-sounding voice
    const voices = synthesis.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.name.includes('Alex') || 
      voice.name.includes('Samantha') ||
      voice.name.includes('Daniel') ||
      voice.lang.startsWith('en-')
    );
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      voiceState.update(state => ({ ...state, isSpeaking: true }));
    };

    utterance.onend = () => {
      voiceState.update(state => ({ ...state, isSpeaking: false }));
      resolve();
    };

    utterance.onerror = (event) => {
      voiceState.update(state => ({ ...state, isSpeaking: false }));
      reject(new Error(`Speech synthesis error: ${event.error}`));
    };

    synthesis.speak(utterance);
  });
}

export function stopSpeaking() {
  if (synthesis) {
    synthesis.cancel();
    voiceState.update(state => ({ ...state, isSpeaking: false }));
  }
}