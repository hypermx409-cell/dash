"use client";
import { useEffect, useRef, useState } from "react";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Timer, Play, Pause, Coins, RefreshCw, X as XIcon, Circle } from "lucide-react";

function winner(board: (string | null)[]) {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a,b,c] of lines) if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  if (board.every((v) => v)) return "draw";
  return null;
}

export default function AfkPage() {
  const { refresh } = useAuth();
  const [mod, setMod] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [earned, setEarned] = useState(0);
  const [message, setMessage] = useState("");
  const [remaining, setRemaining] = useState(60);
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [status, setStatus] = useState<"playing" | "won" | "lost" | "draw">("playing");

  const timerRef = useRef<any>(null);
  const gameRef = useRef<any>(null);

  const load = async () => setMod(await api("/modules/afk"));
  const interval = Number(mod?.config?.interval_seconds || 60);
  const rate = Number(mod?.config?.coins_per_interval || mod?.config?.rate_per_minute || 1);

  useEffect(() => { load(); return () => { if (timerRef.current) clearInterval(timerRef.current); }; }, []);
  useEffect(() => { setRemaining(interval); }, [interval]);

  async function ping() {
    try {
      const res = await api("/afk/ping", { method: "POST" });
      if (res.credited) {
        setEarned((e) => e + (res.reward || 0));
        setMessage(`Earned ${res.reward} coins. Balance: ${res.balance}`);
        await refresh();
      } else {
        setMessage(`Next reward in ${res.retry_after}s`);
      }
      setLastResult(res);
      setRemaining(res.retry_after ?? interval);
    } catch (e: any) { setMessage(e.message); }
  }

  useEffect(() => {
    if (!running) return;
    timerRef.current = setInterval(() => {
      setRemaining((r) => (r <= 1 ? 0 : r - 1));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running]);

  useEffect(() => {
    if (!running) return;
    if (remaining !== 0) return;
    ping();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, running]);

  function start() {
    if (running) return;
    setRunning(true);
    setRemaining(interval);
    ping();
  }
  function stop() {
    setRunning(false);
    setMessage("AFK paused.");
  }

  function botMove(next: (string | null)[]) {
    const available = next.map((v, i) => (v ? null : i)).filter((v) => v !== null) as number[];
    if (available.length === 0) return next;
    const pick = available[Math.floor(Math.random() * available.length)];
    const copy = [...next];
    copy[pick] = "O";
    return copy;
  }

  function play(i: number) {
    if (!running) { setMessage("Start AFK first."); return; }
    if (board[i] || status !== "playing") return;
    const next = [...board];
    next[i] = "X";
    const w = winner(next);
    if (w) {
      setBoard(next);
      setStatus(w === "X" ? "won" : w === "draw" ? "draw" : "lost");
      return;
    }
    // bot move after slight delay
    if (gameRef.current) clearTimeout(gameRef.current);
    gameRef.current = setTimeout(() => {
      const after = botMove(next);
      const w2 = winner(after);
      setBoard(after);
      if (w2) setStatus(w2 === "X" ? "won" : w2 === "draw" ? "draw" : "lost");
    }, 350);
    setBoard(next);
  }

  function resetGame() {
    setBoard(Array(9).fill(null));
    setStatus("playing");
  }

  const progress = Math.max(0, Math.min(100, ((interval - remaining) / interval) * 100));

  return (
    <RequireAuth><DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">AFK Mini-Game</h1>
            <p className="text-sm text-[var(--muted)]">AFK runs in the background while you play. Earn {rate} coins every {interval}s.</p>
          </div>
          <div className="flex w-full justify-center">
            {!running ? (
              <Button onClick={start} disabled={!mod?.enabled} className="w-full max-w-xs justify-center px-8 py-3 text-base"><Play size={18} /> Start AFK</Button>
            ) : (
              <Button variant="ghost" onClick={stop} className="w-full max-w-xs justify-center px-8 py-3 text-base"><Pause size={18} /> Pause AFK</Button>
            )}
          </div>
        </div>
        {message && <div className="rounded-xl border border-[var(--border)] bg-white/5 p-3 text-sm">{message}</div>}
        {!mod?.enabled && <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-200">AFK module is disabled.</div>}

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="text-center">
            <Timer size={24} className="mx-auto mb-2 text-[var(--accent)]" />
            <div className="text-2xl font-bold">{interval}s</div>
            <div className="text-xs text-[var(--muted)]">Earn interval</div>
          </Card>
          <Card className="text-center">
            <Coins size={24} className="mx-auto mb-2 text-[var(--accent)]" />
            <div className="text-2xl font-bold">{rate}</div>
            <div className="text-xs text-[var(--muted)]">Coins per interval</div>
          </Card>
          <Card className="text-center">
            <Coins size={24} className="mx-auto mb-2 text-green-400" />
            <div className="text-2xl font-bold">{earned}</div>
            <div className="text-xs text-[var(--muted)]">Earned this session</div>
          </Card>
        </div>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Next reward</h2>
            <span className="text-sm text-[var(--muted)]">{remaining}s remaining</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full transition-colors" style={{ width: `${progress}%`, background: "linear-gradient(90deg,var(--accent),var(--accent-2))" }} />
          </div>
          {lastResult?.retry_after !== undefined && !lastResult?.credited && !running && (
            <div className="mt-2 text-xs text-[var(--muted)]">Next claim in {lastResult.retry_after}s</div>
          )}
        </Card>

        <Card className="flex flex-col items-center gap-4 p-6">
          <h2 className="text-lg font-semibold self-start">Tic-Tac-Toe (you vs bot)</h2>
          <p className="self-start text-sm text-[var(--muted)]">Play without pausing AFK. You are X, bot is O.</p>
          <div className="grid grid-cols-3 gap-2">
            {board.map((cell, i) => (
              <button
                key={i}
                onClick={() => play(i)}
                className="flex h-16 w-16 items-center justify-center rounded-xl border border-[var(--border)] bg-white/5 text-2xl font-bold transition hover:border-[var(--accent)]/60"
              >
                {cell === "X" && <XIcon size={28} className="text-[var(--accent)]" />}
                {cell === "O" && <Circle size={28} className="text-[var(--accent-2)]" />}
              </button>
            ))}
          </div>
          <div className="text-sm">
            {status === "playing" && "Your turn"}
            {status === "won" && <span className="text-green-400">You win!</span>}
            {status === "lost" && <span className="text-red-400">Bot wins!</span>}
            {status === "draw" && <span className="text-yellow-400">Draw</span>}
          </div>
          <Button variant="ghost" onClick={resetGame}>Reset board</Button>
        </Card>
      </div>
    </DashboardShell></RequireAuth>
  );
}
