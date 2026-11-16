import React from 'react';
import { en } from '../../i18n/index.js';
import './ComingSoon.css';

export interface ComingSoonProps {
  readonly title: string;
}

export const ComingSoon: React.FC<ComingSoonProps> = ({ title }) => {
  return (
    <div className="ar-coming-soon">
      <h1 className="ar-coming-soon-title">{title}</h1>
      <p className="ar-coming-soon-msg">{en.placeholders.comingSoon}</p>
    </div>
  );
};
