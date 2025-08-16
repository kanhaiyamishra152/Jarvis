
import { useState, useEffect, useRef, useCallback } from 'react';

const WAKE_WORD = 'hey jarvis';

// Add minimal type definitions for the Web Speech API to satisfy TypeScript.
interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  onresult: (event: any) => void;
  onstart: () => void;
  onend: () => void;
  onerror: (event: any) => void;
  start: () => void;
  stop: () => void;
}

// Add type info for Web Speech API to the global window object
declare global {
  interface Window {
    SpeechRecognition: { new (): SpeechRecognition };
    webkitSpeechRecognition: { new (): SpeechRecognition };
    SpeechRecognitionEvent: any;
  }
}

interface UseSpeechOptions {
  onListen: (transcript: string) => void;
  onStateChange: (newState: 'listening' | 'speaking' | 'idle') => void;
  onError: (errorType: string) => void;
}

const SpeechRecognitionApi =
  window.SpeechRecognition || window.webkitSpeechRecognition;

export const useSpeech = ({ onListen, onStateChange, onError }: UseSpeechOptions) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAwake, setIsAwake] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  // Control flag to manage intended listening state and prevent restart loops.
  const recognitionControl = useRef({ isIntended: false });
  
  const onListenRef = useRef(onListen);
  useEffect(() => { onListenRef.current = onListen; }, [onListen]);

  const onStateChangeRef = useRef(onStateChange);
  useEffect(() => { onStateChangeRef.current = onStateChange; }, [onStateChange]);

  const onErrorRef = useRef(onError);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const startListening = useCallback(() => {
    recognitionControl.current.isIntended = true;
    if (recognitionRef.current) {
        try {
            recognitionRef.current.start();
        } catch (e) {
            // Can happen if it's already running.
        }
    }
  }, []);

  const stopListening = useCallback(() => {
    recognitionControl.current.isIntended = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Can happen if it's already stopped.
      }
    }
  }, []);
  
  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    // The utterance's onend event will handle resetting state.
  }, []);

  const speak = useCallback((text: string, messageId: string) => {
    if (!text || typeof window === 'undefined' || !window.speechSynthesis) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => {
      setIsSpeaking(true);
      setSpeakingMessageId(messageId);
      onStateChangeRef.current('speaking');
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingMessageId(null);
      onStateChangeRef.current('idle');
    };
    utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
      // 'interrupted' and 'canceled' are normal events when speech is stopped by the user or a new speech request.
      if (event.error === 'interrupted' || event.error === 'canceled') {
        return;
      }
      console.error('Speech synthesis error:', event.error ? event.error.toString() : 'Unknown speech error');
      
      // A true error may prevent 'onend' from firing, so we perform cleanup here as a fallback.
      setIsSpeaking(false);
      setSpeakingMessageId(null);
      onStateChangeRef.current('idle');
    };

    window.speechSynthesis.cancel(); // Clear the queue
    window.speechSynthesis.speak(utterance);
  }, []);

  // Using a ref for processResult to break dependency cycles in useEffect.
  const processResultRef = useRef((_event: any) => {});
  useEffect(() => {
    processResultRef.current = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            }
        }
        
        const transcriptLower = finalTranscript.toLowerCase().trim();
        if (!transcriptLower) return; // Ignore empty results.

        if (!isAwake && transcriptLower.includes(WAKE_WORD)) {
            setIsAwake(true);
            speak("Yes?", "jarvis-wake-ack");
        } else if (isAwake && transcriptLower) {
            onListenRef.current(finalTranscript);
            setIsAwake(false); // Go back to sleep after processing one command
        }
    }
  }, [isAwake, speak]);


  // This effect runs once on mount to set up the recognition instance.
  useEffect(() => {
    if (!SpeechRecognitionApi) {
      onErrorRef.current("Speech Recognition API not supported in this browser.");
      return;
    }
    
    const recognition = new SpeechRecognitionApi();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => processResultRef.current(event);

    recognition.onstart = () => {
      setIsListening(true);
      if (!window.speechSynthesis.speaking) {
        onStateChangeRef.current('listening');
      }
    };
    
    recognition.onend = () => {
      // If we are about to restart, don't flicker the UI state.
      if (!recognitionControl.current.isIntended) {
        setIsListening(false);
        if (!window.speechSynthesis.speaking) {
          onStateChangeRef.current('idle');
        }
      }
      
      // Auto-restart only if we intend to be listening.
      if (recognitionControl.current.isIntended) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch(e) {
            // Can happen if stopListening was called during the timeout.
          }
        }, 50); // Use a minimal delay for stability.
      }
    };
    
    recognition.onerror = (e: any) => {
      // Don't set isListening to false here on errors like 'no-speech' 
      // because onend will handle the restart logic, preventing flicker.
      if (e.error !== 'no-speech') {
        setIsListening(false);
        onStateChangeRef.current('idle');
        onErrorRef.current(e.error);
      }
    };

    recognitionRef.current = recognition;
    startListening(); // Kick off listening on mount.

    return () => {
      recognitionControl.current.isIntended = false; // Ensure no restarts on unmount
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      window.speechSynthesis.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty array ensures this effect runs only once.

  return { isListening, isSpeaking, speak, stopSpeaking, speakingMessageId, isAwake, startListening, stopListening };
};
