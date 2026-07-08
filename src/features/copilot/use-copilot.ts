import { useCallback, useEffect, useRef, useState } from 'react';

import { buildCopilotContext, type CopilotContext } from './context';
import { planToolCalls } from './planner';
import { friendlyCopilotError, runToolCall, type ToolCall, type ToolResult } from './tools';

export type CopilotMessage =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; text: string }
  | { id: string; role: 'tool_call'; call: ToolCall }
  | { id: string; role: 'tool_result'; call: ToolCall; result: ToolResult }
  | { id: string; role: 'error'; text: string };

let messageCounter = 0;

function newId(): string {
  messageCounter += 1;
  return `msg-${Date.now().toString(36)}-${messageCounter}`;
}

/**
 * Copilot conversation state machine: plan -> structured tool calls ->
 * typed results. The hook never touches WDK custody; transfer results carry
 * unsigned drafts that screens hand to the confirm sheet.
 */
export function useCopilot() {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [context, setContext] = useState<CopilotContext | null>(null);
  const contextRef = useRef<CopilotContext | null>(null);

  const refreshContext = useCallback(async (): Promise<CopilotContext> => {
    const next = await buildCopilotContext();
    contextRef.current = next;
    setContext(next);
    return next;
  }, []);

  useEffect(() => {
    refreshContext().catch(() => undefined);
  }, [refreshContext]);

  const push = useCallback((message: CopilotMessage) => {
    setMessages((previous) => [...previous, message]);
  }, []);

  const send = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean) return;

      push({ id: newId(), role: 'user', text: clean });
      setIsThinking(true);
      try {
        const ctx = contextRef.current ?? (await refreshContext());
        const plan = planToolCalls(clean, ctx);

        if (plan.type === 'say' || plan.type === 'refuse') {
          push({ id: newId(), role: 'assistant', text: plan.message });
          return;
        }

        if (plan.preamble) push({ id: newId(), role: 'assistant', text: plan.preamble });
        for (const call of plan.calls) {
          push({ id: newId(), role: 'tool_call', call });
          try {
            const result = await runToolCall(call, ctx);
            push({ id: newId(), role: 'tool_result', call, result });
          } catch (error) {
            push({ id: newId(), role: 'error', text: friendlyCopilotError(error) });
          }
        }
      } catch (error) {
        push({ id: newId(), role: 'error', text: friendlyCopilotError(error) });
      } finally {
        setIsThinking(false);
      }
    },
    [push, refreshContext],
  );

  return { messages, isThinking, context, send, refreshContext };
}
