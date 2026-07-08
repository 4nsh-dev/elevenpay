/** React hook for the split board (splits I'm in + requests I owe). */

import { useCallback, useEffect, useState } from 'react';

import {
  loadSplitBoard,
  type OwedRequestView,
  type SplitHistoryView,
} from './split-service';

export function useSplitBoard() {
  const [mySplits, setMySplits] = useState<SplitHistoryView[]>([]);
  const [owedRequests, setOwedRequests] = useState<OwedRequestView[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setError(null);
      const board = await loadSplitBoard();
      setMySplits(board.mySplits);
      setOwedRequests(board.owedRequests);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load your splits.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { mySplits, owedRequests, isLoading, error, reload };
}
