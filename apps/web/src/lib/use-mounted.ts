'use client';
import { useEffect, useState } from 'react';

/** True after the first client render, so server HTML and first client paint agree. */
export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}
