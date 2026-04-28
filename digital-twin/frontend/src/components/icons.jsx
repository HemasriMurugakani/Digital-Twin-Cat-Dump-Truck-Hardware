import React from 'react';

export function BellIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 22c1.1 0 2-.9 2-2H10c0 1.1.9 2 2 2z" fill="currentColor" />
      <path d="M18 16v-5c0-3.07-1.63-5.64-4.5-6.32V4a1.5 1.5 0 10-3 0v.68C7.63 5.36 6 7.92 6 11v5l-1.99 2H20l-2-2z" fill="currentColor" />
    </svg>
  );
}

export default null;
