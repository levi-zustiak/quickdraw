"use client";

import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Detail, H1, Small } from "@/components/ui/typography";

interface InviteScreenProps {
  roomCode: string;
  onCancel: () => void;
  onPlayBot: () => void;
}

export function InviteScreen({
  roomCode,
  onCancel,
  onPlayBot,
}: InviteScreenProps) {
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const link = `${typeof window !== "undefined" ? window.location.origin : ""}?join=${roomCode.toLowerCase()}`;
  const display = link.replace(/^https?:\/\//, "");

  const copy = () => {
    navigator.clipboard?.writeText(link).catch(() => {});
    inputRef.current?.select();
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="flex-1 relative overflow-hidden bg-qd-paper">
      <div className="absolute inset-0 flex items-center justify-center z-10 p-6 overflow-y-auto">
        <div className="flex flex-col items-center gap-6 max-w-[560px] w-full my-auto">
          <Detail>ROOM {roomCode} · CREATED</Detail>

          <H1 className="text-center">Send them the link.</H1>

          <Small className="text-center max-w-[420px] m-0">
            Whoever opens this link drops straight into the duel as your
            opponent. A third visitor watches from the sidelines.
          </Small>

          {/* Shareable link card */}
          <Card data-variant="qd-card" className="w-full mt-1">
            <CardHeader className="flex flex-row justify-between items-center">
              <Detail>Shareable link</Detail>
              <Detail className="tracking-[0.08em]">ROOM · {roomCode}</Detail>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex gap-2 items-stretch">
                <Input
                  ref={inputRef}
                  className="flex-1 text-qd-ink-2"
                  value={display}
                  readOnly
                  onFocus={(e) => e.currentTarget.select()}
                />
                <Button onClick={copy}>
                  {copied ? "✓ Copied" : "Copy link"}
                </Button>
              </div>
              <Detail className="tracking-[0.05em]">
                Paste it anywhere — chat, DM, email. No code to type.
              </Detail>
            </CardContent>
          </Card>

          {/* Waiting pill */}
          <div className="flex items-center gap-3 mt-2">
            <Badge variant="qd-accent">
              <span className="w-1.5 h-1.5 rounded-full bg-qd-accent qd-pill-dot-blink inline-block" />
              Waiting for opponent…
            </Badge>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3">
            <Button variant="qd-ghost" onClick={onCancel}>
              ← Cancel duel
            </Button>
            <Button variant="qd-secondary" onClick={onPlayBot}>
              Play vs bot instead →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
