import React, { useEffect, useState } from 'react';
import type { Clock } from '@arunodaya/engine';
import { en } from '../i18n/index.js';
import type { SnapshotService } from '../snapshot/service.js';
import { AppShell } from './AppShell.js';
import { parseRoute, type Route } from './routes.js';
import { ComingSoon } from './screens/ComingSoon.js';
import { Home } from './screens/Home.js';

export interface AppProps {
  readonly clock: Clock;
  readonly snapshotService: SnapshotService;
  readonly isSimulated?: boolean;
  readonly clockFormat?: '12h' | '24h' | undefined;
}

export const App: React.FC<AppProps> = ({
  clock,
  snapshotService,
  isSimulated = false,
  clockFormat = '12h',
}) => {
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
          <Home
            clock={clock}
            snapshotService={snapshotService}
            isSimulated={isSimulated}
            clockFormat={clockFormat}
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
          <Home
            clock={clock}
            snapshotService={snapshotService}
            isSimulated={isSimulated}
            clockFormat={clockFormat}
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
