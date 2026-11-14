import { useEffect, useRef, useState } from 'react';

export function useVoiceCoach() {
  const [voiceCoachEnabled, setEnabled] = useState(false);
  const [voiceCoachStatus, setStatus] = useState('Off');
  const enabled = useRef(false);
  const speech = useRef<SpeechSynthesis | null>(null);
  const voice = useRef<SpeechSynthesisVoice | null>(null);
  const faultUtterance = useRef<SpeechSynthesisUtterance | null>(null);
  const activeUtterance = useRef<SpeechSynthesisUtterance | null>(null);
  const pendingRep = useRef<string | null>(null);
  function cancelSpeech() {
    activeUtterance.current = null; faultUtterance.current = null; pendingRep.current = null;
    try { speech.current?.cancel(); } catch { /* Voice output must never block a workout. */ }
  }
  function refreshVoice() {
    try {
      voice.current = speech.current?.getVoices().find(candidate => candidate.localService) ?? null;
      setStatus(!enabled.current ? 'Off' : !speech.current ? 'Voice Coach unavailable; visible alerts remain active.'
        : voice.current ? `Local voice active: ${voice.current.name} (offline service)`
          : 'No local offline voice available; visible alerts remain active.');
    } catch {
      voice.current = null;
      setStatus(enabled.current ? 'Voice Coach unavailable; visible alerts remain active.' : 'Off');
    }
  }
  function setVoiceCoachEnabled(value: boolean) {
    cancelSpeech(); enabled.current = value; setEnabled(value); refreshVoice();
  }
  function speak(text: string, isFault = false) {
    if (!enabled.current || !speech.current || !voice.current) return;
    if (faultUtterance.current && !isFault) { pendingRep.current = text; return; }
    try {
      cancelSpeech();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice.current;
      utterance.lang = voice.current.lang;
      activeUtterance.current = utterance;
      if (isFault) faultUtterance.current = utterance;
      utterance.onend = () => {
        if (activeUtterance.current !== utterance) return;
        activeUtterance.current = null;
        if (faultUtterance.current !== utterance) return;
        faultUtterance.current = null;
        const pending = pendingRep.current; pendingRep.current = null;
        if (pending) speak(pending);
      };
      utterance.onerror = event => {
        if (activeUtterance.current !== utterance) return;
        cancelSpeech();
        if (event.error === 'canceled' || event.error === 'interrupted') return;
        voice.current = null;
        if (enabled.current) setStatus('Voice Coach unavailable; visible alerts remain active.');
      };
      speech.current.speak(utterance);
    } catch {
      cancelSpeech();
      voice.current = null;
      setStatus('Voice Coach unavailable; visible alerts remain active.');
    }
  }
  useEffect(() => {
    try {
      speech.current = window.speechSynthesis ?? null;
      speech.current?.addEventListener('voiceschanged', refreshVoice);
    } catch { speech.current = null; }
    return () => {
      cancelSpeech();
      speech.current?.removeEventListener('voiceschanged', refreshVoice);
    };
  }, []);
  return { voiceCoachEnabled, voiceCoachStatus, setVoiceCoachEnabled, cancelSpeech, speak };
}
