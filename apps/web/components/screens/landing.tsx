"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { usePreferences } from "@/lib/quickdraw/use-preferences";

interface LandingScreenProps {
  onCreate: (name?: string) => void;
  onJoin: (code: string) => void;
  vsBotShortcut: () => void;
  hasHover?: boolean;
  inviteCode?: string;
}

export function LandingScreen({
  onCreate,
  onJoin,
  vsBotShortcut,
  hasHover = false,
  inviteCode,
}: LandingScreenProps) {
  const [code, setCode] = useState(inviteCode ?? "");
  const [showJoin, setShowJoin] = useState(!!inviteCode);
  const { playerName, setPlayerName, holsterStyle, setHolsterStyle } =
    usePreferences();

  useEffect(() => {
    if (inviteCode) {
      setCode(inviteCode);
      setShowJoin(true);
    }
  }, [inviteCode]);

  return (
    <div className="flex-1 relative overflow-hidden bg-qd-paper">
      <div className="absolute inset-0 flex items-center justify-center z-10 p-6 overflow-y-auto">
        <div className="flex flex-col items-center gap-7 max-w-130 text-center my-auto">
          <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-qd-ink-3">
            1V1 · BROWSER DUEL
          </span>

          <h1 className="font-sans text-[64px] font-semibold tracking-[-0.02em] leading-none text-qd-ink">
            {inviteCode ? "You've been challenged." : "Settle it the old way."}
          </h1>

          <p className="text-[14px] text-qd-ink-2 leading-relaxed max-w-110 font-sans">
            {inviteCode
              ? "Enter your name, then join the duel."
              : hasHover
                ? "Holster your cursor. Wait for the draw. First click hits — accuracy tells the damage. First to zero hits the dirt."
                : "Press and hold the holster. Wait for the draw. First tap hits — accuracy tells the damage. First to zero hits the dirt."}
          </p>

          {/* Name input */}
          <div className="w-85">
            <input
              className="w-full h-10 font-mono text-[13px] tracking-[0.04em] px-[14px] bg-qd-surface border border-qd-line-strong rounded-[3px] text-qd-ink text-center outline-none focus:border-qd-ink placeholder:text-qd-ink-4"
              value={playerName}
              placeholder="Your name (optional)"
              maxLength={24}
              onChange={(e) => setPlayerName(e.target.value)}
            />
          </div>

          <div className="flex flex-col items-center gap-[10px] w-[340px] mt-2">
            <Button
              className="w-full"
              onClick={() => onCreate(playerName || "YOU")}
            >
              Create a duel
            </Button>

            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setShowJoin((v) => !v)}
            >
              Join by code
            </Button>

            {showJoin && (
              <div className="flex items-center gap-2 w-full">
                <input
                  className="flex-1 h-10 font-mono text-[14px] tracking-[0.18em] px-[14px] bg-qd-surface border border-qd-line-strong rounded-[3px] text-qd-ink text-center uppercase outline-none focus:border-qd-ink"
                  value={code}
                  placeholder="XXXXXX"
                  maxLength={6}
                  autoFocus
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                />
                <Button
                  variant="qd-primary"
                  onClick={() => onJoin(code)}
                  disabled={code.length < 6}
                  className="py-[10px] text-[14px]"
                >
                  Enter
                </Button>
              </div>
            )}
          </div>

          <Button
            variant="qd-ghost"
            onClick={vsBotShortcut}
            className="text-[11px] py-[6px] px-[12px]"
          >
            …or duel a bot
          </Button>
        </div>
      </div>
    </div>
  );
}
