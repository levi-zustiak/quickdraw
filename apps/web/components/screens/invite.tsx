'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { QrPlaceholder } from '@/components/quickdraw/qr-placeholder';

interface InviteScreenProps {
  roomCode: string;
  onCancel: () => void;
  onPlayBot: () => void;
}

export function InviteScreen({ roomCode, onCancel, onPlayBot }: InviteScreenProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const link = `quickdraw.gg/d/${roomCode.replace('·', '').toLowerCase()}`;

  const copy = (what: string, value: string) => {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopied(what);
    setTimeout(() => setCopied(null), 1400);
  };

  return (
    <div className="flex-1 relative overflow-hidden bg-qd-paper">
      <div className="absolute inset-0 flex items-center justify-center z-10 p-6 overflow-y-auto">
        <div className="flex flex-col items-center gap-6 max-w-[880px] w-full my-auto">
          <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-qd-ink-3">ROOM CREATED</span>

          <h1 className="font-sans text-[36px] font-semibold tracking-[-0.01em] leading-[1.05] text-qd-ink">
            Invite your opponent.
          </h1>

          <p className="font-mono text-[12px] tracking-[0.04em] text-qd-ink-3">
            Share any one of these — they all open the same duel.
          </p>

          {/* Cards row */}
          <div className="flex items-stretch gap-4 mt-2 flex-wrap justify-center">
            {/* Room code */}
            <Card data-variant="qd-card" className="w-[220px]">
              <CardHeader>
                <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-qd-ink-3">Room code</span>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-3">
                <div className="font-mono text-[32px] font-semibold tracking-[0.16em] py-3 text-qd-ink">
                  {roomCode}
                </div>
                <Button
                  variant="qd-secondary"
                  className="w-full text-[13px] py-[10px] px-[18px]"
                  onClick={() => copy('code', roomCode)}
                >
                  {copied === 'code' ? '✓ Copied' : 'Copy code'}
                </Button>
              </CardContent>
            </Card>

            {/* Shareable link */}
            <Card data-variant="qd-card" className="w-[280px]">
              <CardHeader>
                <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-qd-ink-3">Shareable link</span>
              </CardHeader>
              <CardContent className="flex flex-col gap-[10px]">
                <div className="h-9 font-mono text-[12px] tracking-[0.04em] px-[10px] py-2 bg-qd-surface border border-qd-line-strong rounded-[3px] text-qd-ink-2 truncate">
                  {link}
                </div>
                <Button
                  variant="qd-secondary"
                  className="text-[13px] py-[10px] px-[18px]"
                  onClick={() => copy('link', link)}
                >
                  {copied === 'link' ? '✓ Copied' : 'Copy link'}
                </Button>
                <div className="flex gap-1">
                  {['SMS', 'Email', '𝕏'].map((label) => (
                    <Button key={label} variant="qd-ghost" className="flex-1 text-[11px] py-[6px] px-[12px]">
                      {label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* QR code */}
            <Card data-variant="qd-card" className="w-[220px]">
              <CardHeader>
                <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-qd-ink-3">Scan on phone</span>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-2">
                <div className="w-[130px] h-[130px] p-[6px] bg-qd-surface border border-qd-line-strong">
                  <QrPlaceholder size={118} seed={roomCode}/>
                </div>
                <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-qd-ink-3">Point your camera</span>
              </CardContent>
            </Card>
          </div>

          {/* Waiting pill */}
          <div className="flex items-center gap-3 mt-2">
            <span className="inline-flex items-center gap-[6px] font-mono text-[10px] tracking-[0.08em] uppercase px-2 py-1 rounded-[2px] bg-qd-accent-soft text-qd-accent border-0">
              <span className="w-[6px] h-[6px] rounded-full bg-qd-accent qd-pill-dot-blink inline-block"/>
              Waiting for opponent…
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3">
            <Button variant="qd-ghost" onClick={onCancel}>
              ← Cancel duel
            </Button>
            <Button variant="qd-secondary" className="text-[13px] py-[10px] px-[18px]" onClick={onPlayBot}>
              Play vs bot instead →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
