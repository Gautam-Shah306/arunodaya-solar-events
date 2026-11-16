import React from 'react';
import { TabBar } from './TabBar.js';
import type { Route } from './routes.js';
import './AppShell.css';

export interface AppShellProps {
  readonly currentRoute: Route;
  readonly onNavigate: (route: Route) => void;
  readonly children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ currentRoute, onNavigate, children }) => {
  return (
    <div className="ar-app-shell">
      <main className="ar-app-main">{children}</main>
      <TabBar currentRoute={currentRoute} onNavigate={onNavigate} />
    </div>
  );
};
