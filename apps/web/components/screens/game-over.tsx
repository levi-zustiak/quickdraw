import { damageBand } from '@quickdraw/game-core';
import type { GameState } from '@quickdraw/game-core';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

interface GameOverScreenProps {
  state: GameState;
  onRematch: () => void;
  onMenu: () => void;
}

export function GameOverScreen({ state, onRematch, onMenu }: GameOverScreenProps) {
  const winner = state.p1.hp > 0 ? 'p1' : 'p2';
  const winName  = winner === 'p1' ? state.p1.name : state.p2.name;
  const lossName = winner === 'p1' ? state.p2.name : state.p1.name;

  return (
    <div className="flex-1 relative overflow-hidden bg-qd-paper">
      <div className="absolute inset-0 flex items-center justify-center z-10 p-6 overflow-y-auto">
        <div className="flex flex-col items-center gap-[22px] max-w-[640px] w-full my-auto">
          <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-qd-ink-3">
            DUEL CONCLUDED · {state.history.length} ROUNDS
          </span>

          <h1 className="font-sans text-[56px] font-semibold tracking-[-0.02em] leading-none text-qd-ink">
            {winName} wins.
          </h1>

          <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-qd-ink-3">
            {lossName} eats dirt.
          </span>

          {/* Round breakdown table */}
          <Card data-variant="qd-card" className="w-full mt-1">
            <CardHeader className="flex-row items-center justify-between">
              <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-qd-ink-3">Round breakdown</span>
              <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-qd-ink-3">{state.history.length} rounds</span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[240px] overflow-auto">
                <table className="w-full border-collapse text-[12px] font-mono">
                  <thead>
                    <tr>
                      <th className="text-left text-[10px] tracking-[0.08em] uppercase text-qd-ink-3 font-medium px-3 py-2 border-b border-qd-line bg-qd-paper w-10">#</th>
                      <th className="text-left text-[10px] tracking-[0.08em] uppercase text-qd-ink-3 font-medium px-3 py-2 border-b border-qd-line bg-qd-paper">Winner</th>
                      <th className="text-left text-[10px] tracking-[0.08em] uppercase text-qd-ink-3 font-medium px-3 py-2 border-b border-qd-line bg-qd-paper">Reaction</th>
                      <th className="text-left text-[10px] tracking-[0.08em] uppercase text-qd-ink-3 font-medium px-3 py-2 border-b border-qd-line bg-qd-paper">Hit</th>
                      <th className="text-right text-[10px] tracking-[0.08em] uppercase text-qd-ink-3 font-medium px-3 py-2 border-b border-qd-line bg-qd-paper">Dmg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.history.map((h, i) => {
                      const ws = h.winner === 'p1' ? h.p1Shot : h.p2Shot;
                      const wname = h.winner === 'p1' ? state.p1.name : state.p2.name;
                      return (
                        <tr key={i}>
                          <td className="px-3 py-[9px] border-b border-qd-line tabular-nums text-qd-ink-2 last:border-0">
                            {String(h.round).padStart(2, '0')}
                          </td>
                          <td className="px-3 py-[9px] border-b border-qd-line font-semibold text-qd-ink last:border-0">
                            {wname}
                          </td>
                          <td className="px-3 py-[9px] border-b border-qd-line tabular-nums text-qd-ink-2 last:border-0">
                            {ws ? `${(ws.reactionMs / 1000).toFixed(3)}s` : '—'}
                          </td>
                          <td className="px-3 py-[9px] border-b border-qd-line text-qd-ink-2 last:border-0">
                            {ws ? damageBand(ws.dist, ws.targetSize).toLowerCase() : '—'}
                          </td>
                          <td className="px-3 py-[9px] border-b border-qd-line tabular-nums text-right text-qd-ink-2 last:border-0">
                            −{h.damage}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center gap-[10px] mt-2">
            <Button variant="qd-ghost" onClick={onMenu}>
              ← Main menu
            </Button>
            <Button variant="qd-secondary" className="text-[13px] py-[10px] px-[18px]">
              Share result
            </Button>
            <Button variant="qd-primary" onClick={onRematch}>
              Rematch →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
