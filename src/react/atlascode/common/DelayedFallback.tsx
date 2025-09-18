import React from 'react';

interface DelayedFallbackProps {
  delayMs?: number;
  children: React.ReactNode;
}

// Shows nothing for the first `delayMs` ms, then renders `children` (e.g., a loader)
export const DelayedFallback: React.FC<DelayedFallbackProps> = ({ delayMs = 250, children }) => {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    const id = setTimeout(() => setShow(true), delayMs);
    return () => clearTimeout(id);
  }, [delayMs]);

  if (!show) {
    return null;
  }
  return <>{children}</>;
};
