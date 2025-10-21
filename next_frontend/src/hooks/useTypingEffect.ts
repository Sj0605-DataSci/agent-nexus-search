import { useState, useEffect, useCallback, useRef } from "react";

interface UseTypingEffectProps {
  phrases: string[];
  typingSpeed?: number;
  delayBetweenPhrases?: number;
  delayBeforeClearing?: number;
}

export const useTypingEffect = ({
  phrases,
  typingSpeed = 100,
  delayBetweenPhrases = 2000,
  delayBeforeClearing = 1500,
}: UseTypingEffectProps) => {
  // Handle edge case: empty phrases array
  const validPhrases = phrases && phrases.length > 0 ? phrases : ["Search placeholder"];

  const [currentText, setCurrentText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<"typing" | "pause" | "clear">("typing");

  // Use refs for timeouts to properly clean them up
  const clearingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const nextPhraseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset animation if phrases change
  const phrasesRef = useRef<string[]>(validPhrases);
  useEffect(() => {
    if (JSON.stringify(phrasesRef.current) !== JSON.stringify(validPhrases)) {
      phrasesRef.current = validPhrases;
      setCurrentText("");
      setCurrentIndex(0);
      setPhase("typing");

      // Clear any pending timeouts
      if (clearingTimeoutRef.current) {
        clearTimeout(clearingTimeoutRef.current);
        clearingTimeoutRef.current = null;
      }
      if (nextPhraseTimeoutRef.current) {
        clearTimeout(nextPhraseTimeoutRef.current);
        nextPhraseTimeoutRef.current = null;
      }
    }
  }, [validPhrases]);

  const animateText = useCallback(() => {
    // Safety check for index out of bounds
    const safeIndex = currentIndex % validPhrases.length;
    const currentPhrase = validPhrases[safeIndex] || "";

    switch (phase) {
      case "typing":
        if (currentText.length < currentPhrase.length) {
          setCurrentText(currentPhrase.slice(0, currentText.length + 1));
        } else {
          setPhase("pause");
          // Clear any existing timeout
          if (clearingTimeoutRef.current) {
            clearTimeout(clearingTimeoutRef.current);
          }
          clearingTimeoutRef.current = setTimeout(() => {
            setPhase("clear");
            clearingTimeoutRef.current = null;
          }, delayBeforeClearing);
        }
        break;

      case "pause":
        // Just waiting during the pause phase
        break;

      case "clear":
        // Clear the entire text at once
        setCurrentText("");
        // Clear any existing timeout
        if (nextPhraseTimeoutRef.current) {
          clearTimeout(nextPhraseTimeoutRef.current);
        }
        nextPhraseTimeoutRef.current = setTimeout(() => {
          setCurrentIndex(prevIndex => (prevIndex + 1) % validPhrases.length);
          setPhase("typing");
          nextPhraseTimeoutRef.current = null;
        }, 100); // Small delay before starting the next phrase
        break;
    }
  }, [currentIndex, currentText, delayBeforeClearing, phase, validPhrases]);

  useEffect(() => {
    if (phase === "pause") return;

    const timer = setTimeout(animateText, phase === "typing" ? typingSpeed : 0);

    return () => clearTimeout(timer);
  }, [animateText, phase, typingSpeed]);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (clearingTimeoutRef.current) clearTimeout(clearingTimeoutRef.current);
      if (nextPhraseTimeoutRef.current) clearTimeout(nextPhraseTimeoutRef.current);
    };
  }, []);

  return currentText;
};
