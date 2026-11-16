import React, { useEffect, useState } from 'react';
import type { Clock } from '@arunodaya/engine';
import { en } from '../i18n/index.js';
import type { SnapshotService } from '../snapshot/service.js';
import { AppShell } from './AppShell.js';
import { parseRoute, type Route } from './routes.js';
import { ComingSoon } from './screens/ComingSoon.js';
import { FoundationHome } from './screens/FoundationHome.js';

export interface AppProps {
  readonly clock: Clock;
  readonly snapshotService: SnapshotService;
  readonly isSimulated?: boolean;
}

export const App: React.FC<AppProps> = ({ clock, snapshotService, isSimulated = false }) => {
  const [route, setRoute] = useState<Route>(() => {
    if (typeof window !== 'undefined') {
      return parseRoute(window.location.hash);
    }
    return 'home';
  });

  useEffect(() => {
    function handleHashChange(): void {
      setRoute(parseRoute(window.location.hash));
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', handleHashChange);
      return () => {
        window.removeEventListener('hashchange', handleHashChange);
      };
    }
  }, []);

  function renderScreen(): React.ReactNode {
    switch (route) {
      case 'home':
        return (
          <FoundationHome
            clock={clock}
            snapshotService={snapshotService}
            isSimulated={isSimulated}
          />
        );
      case 'forecast':
        return <ComingSoon title={en.tabs.forecast} />;
      case 'astronomy':
        return <ComingSoon title={en.tabs.astronomy} />;
      case 'locations':
        return <ComingSoon title={en.tabs.locations} />;
      case 'settings':
        return <ComingSoon title={en.tabs.settings} />;
      default:
        return (
          <FoundationHome
            clock={clock}
            snapshotService={snapshotService}
            isSimulated={isSimulated}
          />
        );
    }
  }

  return (
    <AppShell currentRoute={route} onNavigate={setRoute}>
      {renderScreen()}
    </AppShell>
  );
};
