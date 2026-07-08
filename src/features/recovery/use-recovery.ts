/**
 * Recovery flow state machine: acknowledge -> reveal -> verify -> done.
 *
 * WDK best practices honored here:
 * - The phrase is read via wdkService.revealRecoveryPhrase, which goes through
 *   SecureStore with requireAuthentication — the OS demands biometrics or the
 *   device passcode before the mnemonic leaves secure storage (secure
 *   confirmation, no extra dependency).
 * - Words live only in transient screen state: they auto-hide on a timer, are
 *   dropped when the screen unmounts, and are never copied to the clipboard,
 *   logged, or sent to Supabase.
 * - Verification is a 3-word positional quiz graded locally against the same
 *   in-memory words — nothing to compare against ever leaves the device.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { wdkService } from '@/services/wdk';

import { markPhraseVerified } from './backup-status';

export type RecoveryStage = 'intro' | 'revealed' | 'verify' | 'done';

export type QuizQuestion = {
  /** Zero-based word position the user must confirm. */
  index: number;
  options: string[];
};

export const AUTO_HIDE_SECONDS = 60;
const QUIZ_QUESTIONS = 3;
const QUIZ_OPTIONS = 4;

/** Fallback distractors in case the phrase itself has too few unique words. */
const DECOY_WORDS = [
  'orbit',
  'maple',
  'harbor',
  'copper',
  'falcon',
  'ember',
  'prism',
  'canyon',
  'velvet',
  'tundra',
];

function shuffle<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

export function buildQuiz(words: string[]): QuizQuestion[] {
  const indices = shuffle(words.map((_, index) => index))
    .slice(0, QUIZ_QUESTIONS)
    .sort((a, b) => a - b);

  return indices.map((index) => {
    const answer = words[index];
    const distractors = shuffle([
      ...new Set([
        ...words.filter((word) => word !== answer),
        ...DECOY_WORDS.filter((word) => word !== answer),
      ]),
    ]).slice(0, QUIZ_OPTIONS - 1);

    return { index, options: shuffle([answer, ...distractors]) };
  });
}

export function useRecoveryFlow(userId: string | null) {
  const [stage, setStage] = useState<RecoveryStage>('intro');
  const [words, setWords] = useState<string[]>([]);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(AUTO_HIDE_SECONDS);
  const wordsRef = useRef<string[]>([]);

  /** Hide the words and move to the quiz (used by button and auto-hide). */
  const startVerify = useCallback(() => {
    if (!wordsRef.current.length) return;
    setQuiz(buildQuiz(wordsRef.current));
    setAnswers({});
    setError(null);
    setWords([]);
    setStage('verify');
  }, []);

  // Countdown while the phrase is on screen.
  useEffect(() => {
    if (stage !== 'revealed') return;
    setSecondsLeft(AUTO_HIDE_SECONDS);
    const timer = setInterval(() => {
      setSecondsLeft((previous) => (previous <= 1 ? 0 : previous - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [stage]);

  // Auto-hide: when the countdown ends, blank the words and start the quiz.
  useEffect(() => {
    if (stage === 'revealed' && secondsLeft === 0) startVerify();
  }, [stage, secondsLeft, startVerify]);

  // Drop the phrase from memory when the screen unmounts.
  useEffect(() => {
    return () => {
      wordsRef.current = [];
    };
  }, []);

  const reveal = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // SecureStore requireAuthentication triggers the OS biometric/passcode
      // prompt before the mnemonic is released — callers cannot skip it.
      const revealed = await wdkService.revealRecoveryPhrase(userId);
      wordsRef.current = revealed;
      setWords(revealed);
      setStage('revealed');
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not unlock the recovery phrase.',
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /** Re-show the already-unlocked words (e.g. quiz answers were forgotten). */
  const showAgain = useCallback(() => {
    if (!wordsRef.current.length) return;
    setError(null);
    setWords(wordsRef.current);
    setStage('revealed');
  }, []);

  const selectAnswer = useCallback((index: number, word: string) => {
    setAnswers((previous) => ({ ...previous, [index]: word }));
  }, []);

  const submitVerify = useCallback(async () => {
    const allCorrect = quiz.every(
      (question) => answers[question.index] === wordsRef.current[question.index],
    );
    if (!allCorrect) {
      setAnswers({});
      setError(
        'One or more words did not match your phrase. Check your paper backup and try again.',
      );
      return;
    }
    setError(null);
    await markPhraseVerified(userId).catch(() => undefined);
    wordsRef.current = [];
    setStage('done');
  }, [answers, quiz, userId]);

  return {
    stage,
    words,
    quiz,
    answers,
    isLoading,
    error,
    secondsLeft,
    reveal,
    startVerify,
    showAgain,
    selectAnswer,
    submitVerify,
  };
}
