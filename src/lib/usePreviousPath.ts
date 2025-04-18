'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export const usePreviousPath = () => {
  const pathname = usePathname();
  const previousPath = useRef<string | null>(null);

  useEffect(() => {
    previousPath.current = pathname;
  }, [pathname]);

  return previousPath.current;
};
