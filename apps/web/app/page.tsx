"use client";

import { useEffect, useRef, useState } from "react";
import { useBotGame } from "@/lib/quickdraw/use-bot-game";
import { useMultiplayerGame } from "@/lib/quickdraw/use-multiplayer-game";
import { usePreferences } from "@/lib/quickdraw/use-preferences";
import { AppBar } from "@/components/quickdraw/app-bar";
import { AppFoot } from "@/components/quickdraw/app-foot";
import { LandingScreen } from "@/components/screens/landing";
import { InviteScreen } from "@/components/screens/invite";
import { LobbyScreen } from "@/components/screens/lobby";
import { GameScreen } from "@/components/screens/game";
import { GameOverScreen } from "@/components/screens/game-over";
import type { GameState, GameActions, Phase } from "@quickdraw/game-core";

const PHASE_LABEL: Record<Phase, string> = {
  landing: "Title",
  invite: "Waiting room",
  lobby: "Lobby",
  holster: "Round · holster",
  arming: "Round · armed",
  drawing: "Round · draw!",
  result: "Round · result",
  gameover: "Post-duel",
};

const FOOT_LEFT: Record<Phase, string> = {
  landing: "Browser game · 1v1",
  invite: "Waiting for opponent to join",
  lobby: "Both players must ready up",
  holster: "Move cursor into holster to begin",
  arming: "Hold steady — do not flinch",
  drawing: "Click the target as fast as you can",
  result: "Auto-advancing to next round",
  gameover: "Match complete",
};

function GameRoot({
  state,
  actions,
  hasHover,
  onVsBot,
  inviteCode,
}: {
  state: GameState;
  actions: GameActions;
  hasHover: boolean;
  onVsBot?: () => void;
  inviteCode?: string;
}) {
  const { playerName, holsterStyle } = usePreferences();
  const { phase, p1, p2, roomCode, startingHp, spectators } = state;

  const footRight =
    phase === "landing"
      ? `Starting HP · ${startingHp}`
      : phase === "gameover"
        ? "Fin."
        : `Best gun wins · ${startingHp} HP`;

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-qd-paper">
      <AppBar
        phaseLabel={PHASE_LABEL[phase]}
        roomCode={roomCode}
        playerName={playerName || undefined}
      />

      {phase === "landing" && (
        <LandingScreen
          onCreate={(name) => actions.createRoom(name || "YOU")}
          onJoin={(code, name) => actions.joinRoom(code, name || "YOU")}
          vsBotShortcut={
            onVsBot ??
            (() => {
              actions.createRoom(playerName || "YOU");
              setTimeout(actions.startVsBot, 60);
            })
          }
          hasHover={hasHover}
          inviteCode={inviteCode}
        />
      )}

      {phase === "invite" && (
        <InviteScreen
          roomCode={roomCode}
          onCancel={actions.reset}
          onPlayBot={actions.startVsBot}
        />
      )}

      {phase === "lobby" && (
        <LobbyScreen
          p1={p1}
          p2={p2}
          roomCode={roomCode}
          spectators={spectators}
          max={startingHp}
          myRole={state.myRole}
          onReady={actions.readyUp}
          onUnready={actions.unready}
          onLeave={actions.reset}
        />
      )}

      {(phase === "holster" ||
        phase === "arming" ||
        phase === "drawing" ||
        phase === "result") && (
        <GameScreen
          state={state}
          actions={actions}
          max={startingHp}
          holsterStyle={holsterStyle}
          hasHover={hasHover}
          isSpectator={state.myRole === "spectator"}
        />
      )}

      {phase === "gameover" && (
        <GameOverScreen
          state={state}
          onRematch={actions.rematch}
          onMenu={actions.reset}
        />
      )}

      <AppFoot left={FOOT_LEFT[phase]} right={footRight} />
    </div>
  );
}

function BotGame({
  hasHover,
  autoStart,
}: {
  hasHover: boolean;
  autoStart: boolean;
}) {
  const { state, actions } = useBotGame({
    startingHp: 100,
    timingMode: "random",
    botDifficulty: 0.55,
  });
  const { playerName } = usePreferences();
  const startedRef = useRef(false);

  useEffect(() => {
    if (autoStart && !startedRef.current) {
      startedRef.current = true;
      actions.createRoom(playerName || "YOU");
      setTimeout(actions.startVsBot, 60);
    }
  }, [autoStart, actions, playerName]);

  return <GameRoot state={state} actions={actions} hasHover={hasHover} />;
}

function MultiplayerGame({
  hasHover,
  onVsBot,
  autoJoin,
  onClearAutoJoin,
}: {
  hasHover: boolean;
  onVsBot: () => void;
  autoJoin?: string;
  onClearAutoJoin: () => void;
}) {
  const { state, actions } = useMultiplayerGame({ startingHp: 100 });
  const wrappedReset = () => {
    onClearAutoJoin();
    actions.reset();
  };
  return (
    <GameRoot
      state={state}
      actions={{ ...actions, reset: wrappedReset }}
      hasHover={hasHover}
      onVsBot={onVsBot}
      inviteCode={autoJoin}
    />
  );
}

export default function Home() {
  const [hasHover, setHasHover] = useState(false);
  const [isBot, setIsBot] = useState(false);
  const [botAutoStart, setBotAutoStart] = useState(false);
  const [autoJoin, setAutoJoin] = useState<string | undefined>();

  useEffect(() => {
    setHasHover(window.matchMedia?.("(hover: hover)").matches ?? false);
    const params = new URLSearchParams(window.location.search);
    if (params.get("bot") === "1") setIsBot(true);
    const join = params.get("join");
    if (join) setAutoJoin(join.toUpperCase());
  }, []);

  const handleVsBot = () => {
    setIsBot(true);
    setBotAutoStart(true);
  };

  if (isBot) {
    return <BotGame hasHover={hasHover} autoStart={botAutoStart} />;
  }
  const handleClearAutoJoin = () => {
    setAutoJoin(undefined);
    window.history.replaceState({}, "", "/");
  };

  return (
    <MultiplayerGame
      hasHover={hasHover}
      onVsBot={handleVsBot}
      autoJoin={autoJoin}
      onClearAutoJoin={handleClearAutoJoin}
    />
  );
}
