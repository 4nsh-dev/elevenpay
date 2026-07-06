import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';

/** How long the "Copied ✓" state stays visible. */
const COPIED_RESET_MS = 2000;
/** Auto-clear the clipboard after this window if untouched (docs/ux-flow.md §6). */
const CLIPBOARD_CLEAR_MS = 60_000;

/**
 * Copy text to the clipboard with a success haptic, a transient `copied` flag,
 * and a 60s auto-clear so a public address doesn't linger on the clipboard.
 */
export function useCopy() {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
      if (clearTimer.current) clearTimeout(clearTimer.current);
    };
  }, []);

  const copy = useCallback(async (text: string) => {
    if (!text) return;

    await Clipboard.setStringAsync(text);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setCopied(true);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);

    // Clear the clipboard later, but only if it still holds this value.
    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(async () => {
      const current = await Clipboard.getStringAsync();
      if (current === text) await Clipboard.setStringAsync('');
    }, CLIPBOARD_CLEAR_MS);
  }, []);

  return { copied, copy };
}
