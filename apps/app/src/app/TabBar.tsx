import React from 'react';
import { en } from '../i18n/index.js';
import { ROUTES, routeToHash, type Route } from './routes.js';
import './TabBar.css';

export interface TabBarProps {
  readonly currentRoute: Route;
  readonly onNavigate: (route: Route) => void;
}

export const TabBar: React.FC<TabBarProps> = ({ currentRoute, onNavigate }) => {
  return (
    <nav className="ar-tabbar" aria-label="Main Navigation">
      {ROUTES.map((route) => {
        const isActive = route === currentRoute;
        const label = en.tabs[route];

        return (
          <a
            key={route}
            href={routeToHash(route)}
            className="ar-tabbar-item"
            aria-current={isActive ? 'page' : undefined}
            onClick={(e) => {
              e.preventDefault();
              onNavigate(route);
              window.location.hash = routeToHash(route);
            }}
          >
            <span>{label}</span>
          </a>
        );
      })}
    </nav>
  );
};
