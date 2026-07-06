import type { Session } from '@supabase/supabase-js';
import type { PropsWithChildren } from 'react';
import { useEffect } from 'react';

import { supabase } from '@/services/supabase/client';
import { hydrateWallet } from '@/features/wallet';
import { useSessionStore } from '@/stores/session';

function applySession(session: Session | null) {
  const { clearSession, setSession } = useSessionStore.getState();

  if (!session?.user) {
    clearSession();
    void hydrateWallet(null);
    return;
  }

  const metadata = session.user.user_metadata;

  setSession({
    userId: session.user.id,
    email: session.user.email ?? null,
    username: typeof metadata.username === 'string' ? metadata.username : null,
    fullName: typeof metadata.full_name === 'string' ? metadata.full_name : null,
  });
  void hydrateWallet(session.user.id);
}

export function AuthBootstrap({ children }: PropsWithChildren) {
  useEffect(() => {
    let isMounted = true;

    useSessionStore.getState().setBootstrapping(true);

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      applySession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return children;
}
