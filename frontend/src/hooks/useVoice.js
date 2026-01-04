import { useState } from 'react';

export const useVoice = () => {
  const [isListening, setIsListening] = useState(false);

  // 1. AI Speaking (Text-to-Speech)
  const speak = (text) => {
    if (!text) return;
    window.speechSynthesis.cancel(); // Stop any current speaking
    const utterance = new SpeechSynthesisUtterance(text);

    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'hi-IN'; 
      utterance.rate = 0.9;
      console.log("AI is speaking:", text);
      window.speechSynthesis.speak(utterance);
    }, 300);
  };

  // 2. User Speaking (Speech-to-Text)
  const listen = (callback) => {
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!SpeechRecognition) {
      alert("Please use Chrome or Edge for voice features.");
      return;
    }

    const recognition = new SpeechRecognition();
    
    // en-IN handles mixed Hinglish (e.g., "Ek Pizza add karo") better than hi-IN alone
    recognition.lang = 'en-IN'; 
    recognition.interimResults = false; // Only want the final result
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log("🎤 Mic active: Listening...");
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log("🎯 Speech detected:", transcript);
      callback(transcript);
    };

    recognition.onerror = (event) => {
      console.error("❌ Speech Recognition Error:", event.error);
      setIsListening(false);
      
      if (event.error === 'not-allowed') {
        alert("Microphone access blocked. Please enable it in your browser settings.");
      }
    };

    recognition.onend = () => {
      console.log("🛑 Mic inactive: Recognition ended.");
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (err) {
      console.error("Recognition start error:", err);
    }
  };

  return { speak, listen, isListening };
};