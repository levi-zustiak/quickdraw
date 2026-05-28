"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Display, Detail, Muted, P } from "@/components/ui/typography";
import { usePreferences } from "@/lib/quickdraw/use-preferences";

interface LandingScreenProps {
  onCreate: (name?: string) => void;
  onJoin: (code: string, name: string) => void;
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
  const { playerName, setPlayerName } = usePreferences();
  const [localName, setLocalName] = useState("");
  const joinedRef = useRef(false);

  // Case A: inviteCode present + saved name → auto-join on mount
  useEffect(() => {
    if (inviteCode && playerName && !joinedRef.current) {
      joinedRef.current = true;
      onJoin(inviteCode, playerName);
    }
  }, [inviteCode, playerName, onJoin]);

  // Case A: loading screen while auto-join is in flight
  if (inviteCode && playerName) {
    return (
      <div className="flex-1 relative overflow-hidden bg-qd-paper">
        <div className="absolute inset-0 flex items-center justify-center z-10 p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="inline-flex items-center gap-[8px] font-mono text-[11px] tracking-[0.08em] uppercase text-qd-ink-3">
              <span className="w-[6px] h-[6px] rounded-full bg-qd-accent qd-pill-dot-blink inline-block" />
              Joining duel…
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Case B: inviteCode present + no saved name → focused name prompt
  if (inviteCode) {
    const handleJoin = () => {
      const name = localName.trim() || "YOU";
      setPlayerName(localName.trim());
      onJoin(inviteCode, name);
    };

    return (
      <div className="flex-1 relative overflow-hidden bg-qd-paper">
        <div className="absolute inset-0 flex items-center justify-center z-10 p-6 overflow-y-auto">
          <div className="flex flex-col items-center gap-7 max-w-130 text-center my-auto">
            <Detail>1V1 · BROWSER DUEL</Detail>

            <Display>You&apos;ve been challenged.</Display>

            <P className="max-w-110">
              Enter your name, then step into the duel.
            </P>

            <div className="flex flex-col items-center gap-[10px] w-[340px] mt-2">
              <Input
                className="text-center tracking-[0.04em]"
                value={localName}
                placeholder="Your name (optional)"
                maxLength={24}
                autoFocus
                onChange={(e) => setLocalName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              />
              <Button className="w-full" onClick={handleJoin}>
                Join duel →
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Case C: normal landing — create only, no join-by-code
  return (
    <div className="flex-1 relative overflow-hidden bg-qd-paper">
      <div className="absolute inset-0 flex items-center justify-center z-10 p-6 overflow-y-auto">
        <div className="flex flex-col items-center gap-7 max-w-130 text-center my-auto">
          <Detail>1V1 · BROWSER DUEL</Detail>

          <Display>Settle it the old way.</Display>

          <P className="max-w-110">
            {hasHover
              ? "Holster your cursor. Wait for the draw. First click hits — accuracy tells the damage. First to zero hits the dirt."
              : "Press and hold the holster. Wait for the draw. First tap hits — accuracy tells the damage. First to zero hits the dirt."}
          </P>

          <div className="flex flex-col items-center gap-[10px] w-[340px] mt-2">
            <Button
              className="w-full"
              onClick={() => onCreate("YOU")}
            >
              Create a duel →
            </Button>
            <Muted>You&apos;ll get a link to send your opponent.</Muted>
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
