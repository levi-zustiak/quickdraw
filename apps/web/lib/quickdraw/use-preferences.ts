'use client';

import { useState, useCallback } from 'react';
import type { HolsterStyle } from '@quickdraw/game-core';

interface Preferences {
  playerName: string;
  setPlayerName: (name: string) => void;
  holsterStyle: HolsterStyle;
  setHolsterStyle: (style: HolsterStyle) => void;
}

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = localStorage.getItem(key);
    return v !== null ? (v as unknown as T) : fallback;
  } catch {
    return fallback;
  }
}

export function usePreferences(): Preferences {
  const [playerName, setPlayerNameState] = useState<string>(() =>
    readStorage('qd:playerName', ''),
  );
  const [holsterStyle, setHolsterStyleState] = useState<HolsterStyle>(() =>
    readStorage<HolsterStyle>('qd:holsterStyle', 'buzzer'),
  );

  const setPlayerName = useCallback((name: string) => {
    setPlayerNameState(name);
    if (typeof window !== 'undefined') {
      localStorage.setItem('qd:playerName', name);
    }
  }, []);

  const setHolsterStyle = useCallback((style: HolsterStyle) => {
    setHolsterStyleState(style);
    if (typeof window !== 'undefined') {
      localStorage.setItem('qd:holsterStyle', style);
    }
  }, []);

  return { playerName, setPlayerName, holsterStyle, setHolsterStyle };
}
