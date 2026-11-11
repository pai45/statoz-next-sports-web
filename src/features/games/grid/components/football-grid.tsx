"use client";
import { typography } from "@statoz/design-system/web/tokens/typography";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  accentVar,
  Button,
  CloseIcon,
  FlameIcon,
  GroupsIcon,
  PersonSearchIcon,
  PlusIcon,
  ShareIcon,
  feedbackVar,
  withAlpha,
} from "@statoz/design-system/web";
import { useAuthSession, useRequireAuth } from "@/features/auth";

import { dailyNumberFor, todayKey } from "../../daily/day";
import { shareResult, type ShareOutcome } from "../../daily/share";
import { useDailyCountdown } from "../../daily/use-countdown";
import { normalizeGuessPlayerSearch } from "../../guess-player/engine/normalize";
import { cpuAccuracy, cpuThinkMs, gridGuesses } from "../constants";
import {
  careerName,
  careerShortName,
  cpuCell,
  dailyGrid,
  gridFromSeed,
  gridSearchPool,
  isValidAnswer,
  winnerOf,
  type GridPuzzle,
  type Mark,
} from "../engine/grid";
import { finishGridDay, gridDayFor, gridXp, spendGridGuess, useGridRecord } from "../state/grid-store";

/**
 * Football Grid. Three clubs across, three down: name a player who played for
 * both to fill each cell.
 *
 * DAILY is the same grid for everyone, nine guesses, shareable. VERSUS is
 * tic-tac-toe on a fresh grid, against the computer or a friend on the same
 * device: name a player to claim a cell, miss and the turn passes.
 */

const violet = accentVar("violet");
const gold = accentVar("gold");

type Mode = { name: "daily" } | { name: "versus"; opponent: "cpu" | "friend"; seed: string };

export function FootballGrid() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>({ name: "daily" });
  const leave = useCallback(() => {
    if (window.history.length > 1) router.back();
    else router.push("/quiz/football");
  }, [router]);

  return (
    <div className="relative flex min-h-dvh flex-col">
      <header className="flex shrink-0 items-center gap-2 px-2 py-2.5" style={{ borderBottom: `1px solid ${withAlpha(violet, 0.2)}` }}>
        <button type="button" onClick={leave} aria-label="Leave Football Grid" className="grid size-11 shrink-0 cursor-pointer place-items-center text-subtle">
          <CloseIcon size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display font-black leading-none" style={{ fontSize: typography.sizeRem.p15, letterSpacing: "var(--ds-tracking-ultra)" }}>
            FOOTBALL GRID
          </h1>
          <p className="mt-1 truncate font-display font-black leading-none text-muted" style={{ fontSize: typography.sizeRem.p11, letterSpacing: "var(--ds-tracking-wide)" }}>
            ⚽ NAME A PLAYER FOR BOTH CLUBS
          </p>
        </div>
      </header>

      <nav aria-label="Grid mode" className="mx-auto mt-3 grid w-full max-w-120 grid-cols-3 gap-1.5 px-4">
        <ModeTab active={mode.name === "daily"} label="DAILY" onSelect={() => setMode({ name: "daily" })} />
        <ModeTab
          active={mode.name === "versus" && mode.opponent === "cpu"}
          label="VS CPU"
          onSelect={() => setMode({ name: "versus", opponent: "cpu", seed: `grid:versus:${Date.now()}` })}
        />
        <ModeTab
          active={mode.name === "versus" && mode.opponent === "friend"}
          label="VS FRIEND"
          onSelect={() => setMode({ name: "versus", opponent: "friend", seed: `grid:versus:${Date.now()}` })}
        />
      </nav>

      {mode.name === "daily" ? (
        <DailyGrid />
      ) : (
        <Versus
          key={mode.seed}
          seed={mode.seed}
          opponent={mode.opponent}
          onRematch={() => setMode({ ...mode, seed: `grid:versus:${Date.now()}` })}
        />
      )}
    </div>
  );
}

function ModeTab({ active, label, onSelect }: { active: boolean; label: string; onSelect: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className="h-11 cursor-pointer border font-display font-black"
      style={{
        fontSize: typography.sizeRem.p11,
        letterSpacing: "var(--ds-tracking-wide)",
        color: active ? "var(--ds-color-text-inverse)" : violet,
        background: active ? violet : "transparent",
        borderColor: withAlpha(violet, 0.6),
      }}
    >
      {label}
    </button>
  );
}

/* ---- Board ------------------------------------------------------------------- */

type CellView = {
  label: string | null;
  tone: "empty" | "filled" | "x" | "o" | "missed";
  hint?: string;
};

function Board({
  puzzle,
  cells,
  selected,
  disabled,
  onSelect,
  corner,
}: {
  puzzle: GridPuzzle;
  cells: CellView[];
  selected: number | null;
  disabled: (cell: number) => boolean;
  onSelect: (cell: number) => void;
  corner: React.ReactNode;
}) {
  return (
    <div className="mx-auto mt-4 grid w-full max-w-120 grid-cols-[minmax(0,0.9fr)_repeat(3,minmax(0,1fr))] gap-1.5 px-4">
      <div className="grid place-items-center text-center">{corner}</div>
      {puzzle.cols.map((club) => (
        <ClubHeader key={club.id} code={club.code} label={club.label} />
      ))}
      {puzzle.rows.map((row, r) => (
        <RowCells key={row.id}>
          <ClubHeader code={row.code} label={row.label} />
          {puzzle.cols.map((col, c) => {
            const index = r * 3 + c;
            const view = cells[index];
            return (
              <CellButton
                key={col.id}
                index={index}
                row={row.label}
                col={col.label}
                view={view}
                selected={selected === index}
                disabled={disabled(index)}
                onSelect={() => onSelect(index)}
              />
            );
          })}
        </RowCells>
      ))}
    </div>
  );
}

function RowCells({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function ClubHeader({ code, label }: { code: string; label: string }) {
  return (
    <div className="flex min-h-14 flex-col items-center justify-center border px-1 py-2 text-center" style={{ borderColor: withAlpha(violet, 0.35), background: withAlpha(violet, 0.08) }}>
      <span className="font-display font-black leading-none" style={{ fontSize: typography.sizeRem.p14, color: violet }}>
        {code}
      </span>
      <span className="mt-1 line-clamp-2 font-display font-black leading-tight text-muted" style={{ fontSize: typography.sizeRem.p11 }}>
        {label}
      </span>
    </div>
  );
}

function CellButton({
  index,
  row,
  col,
  view,
  selected,
  disabled,
  onSelect,
}: {
  index: number;
  row: string;
  col: string;
  view: CellView;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const color =
    view.tone === "filled" ? feedbackVar("success") : view.tone === "x" ? accentVar("cyan") : view.tone === "o" ? accentVar("orange") : view.tone === "missed" ? "var(--ds-color-border-default)" : violet;
  const solid = view.tone === "filled" || view.tone === "x" || view.tone === "o";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-label={`${row} and ${col}${view.label ? `: ${view.label}` : view.hint ? `: unfilled, for example ${view.hint}` : ", empty"}`}
      aria-pressed={selected}
      data-cell={index}
      className="flex aspect-square min-h-16 flex-col items-center justify-center border p-1 text-center"
      style={{
        cursor: disabled ? "default" : "pointer",
        borderColor: selected ? gold : withAlpha(color, solid ? 1 : 0.45),
        borderWidth: selected ? 2 : 1,
        background: solid ? withAlpha(color, 0.9) : "var(--ds-color-background-elevated)",
        color: solid ? "var(--ds-color-text-inverse)" : "var(--ds-color-text-muted)",
      }}
    >
      {view.label ? (
        <span className="line-clamp-3 font-display font-black leading-tight" style={{ fontSize: typography.sizeRem.p11 }}>
          {view.label}
        </span>
      ) : view.hint ? (
        <span className="line-clamp-3 font-display font-black leading-tight opacity-70" style={{ fontSize: typography.sizeRem.p11 }}>
          e.g. {view.hint}
        </span>
      ) : disabled ? null : (
        <PlusIcon size={20} style={{ color: violet }} />
      )}
    </button>
  );
}

/* ---- Search sheet -------------------------------------------------------------- */

function PlayerSearch({
  heading,
  excluded,
  onPick,
  onCancel,
}: {
  heading: string;
  excluded: Set<string>;
  onPick: (careerId: string) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  const needle = normalizeGuessPlayerSearch(query);
  const matches = needle.length < 2 ? [] : gridSearchPool.filter((player) => !excluded.has(player.id) && normalizeGuessPlayerSearch(player.name).includes(needle)).slice(0, 6);

  return (
    <div className="mx-auto mt-4 w-full max-w-120 px-4">
      <div className="border p-3" style={{ borderColor: gold, background: "var(--ds-color-background-elevated)" }}>
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 font-display font-black leading-snug" style={{ fontSize: typography.sizeRem.p12, letterSpacing: "var(--ds-tracking-wide)", color: gold }}>
            {heading}
          </p>
          <button type="button" onClick={onCancel} aria-label="Cancel" className="grid size-9 cursor-pointer place-items-center text-muted">
            <CloseIcon size={18} />
          </button>
        </div>
        <label className="relative mt-2 block">
          <span className="sr-only">Search for a player</span>
          <PersonSearchIcon size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: violet }} />
          <input
            ref={input}
            type="search"
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && matches[0]) onPick(matches[0].id);
              if (event.key === "Escape") onCancel();
            }}
            placeholder="Type at least two letters"
            className="h-11 w-full border bg-transparent pl-9 pr-3 text-sm outline-none"
            style={{ borderColor: "var(--ds-color-border-default)" }}
          />
        </label>
        {matches.length > 0 ? (
          <ul className="mt-1.5" role="listbox" aria-label="Matching players">
            {matches.map((player) => (
              <li key={player.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => onPick(player.id)}
                  className="flex min-h-11 w-full cursor-pointer items-center px-2.5 text-left text-sm hover:bg-[color-mix(in_srgb,var(--ds-color-accent-violet)_12%,transparent)]"
                >
                  {player.name}
                </button>
              </li>
            ))}
          </ul>
        ) : needle.length >= 2 ? (
          <p className="mt-2 text-xs text-muted">No player on record matches that name.</p>
        ) : null}
      </div>
    </div>
  );
}

function Flash({ message }: { message: { text: string; good: boolean } | null }) {
  return (
    <p
      role="status"
      className="mx-auto mt-3 min-h-5 w-full max-w-120 px-4 text-center font-display font-black"
      style={{ fontSize: typography.sizeRem.p12, letterSpacing: "var(--ds-tracking-wide)", color: message?.good ? feedbackVar("success") : feedbackVar("danger") }}
    >
      {message?.text ?? ""}
    </p>
  );
}

/* ---- Daily ------------------------------------------------------------------------ */

function DailyGrid() {
  const record = useGridRecord();
  const [dayKey] = useState(() => todayKey());
  const puzzle = useMemo(() => dailyGrid(dayKey), [dayKey]);
  const day = gridDayFor(record, dayKey);
  const [selected, setSelected] = useState<number | null>(null);
  const [flash, setFlash] = useState<{ text: string; good: boolean } | null>(null);

  if (!puzzle) return <p className="p-8 text-center text-sm text-muted">No grid today.</p>;

  const placed = day?.cells ?? {};
  const used = new Set(Object.values(placed));
  const done = day?.done ?? false;
  const left = gridGuesses - (day?.guessesUsed ?? 0);
  const filled = Object.keys(placed).length;

  const cells: CellView[] = Array.from({ length: 9 }, (_, index) => {
    const id = placed[index];
    if (id) return { label: careerShortName(id), tone: "filled" };
    if (done) {
      const example = puzzle.answers[index].find((answer) => !used.has(answer));
      return { label: null, tone: "missed", hint: example ? careerShortName(example) : undefined };
    }
    return { label: null, tone: "empty" };
  });

  return (
    <>
      <Board
        puzzle={puzzle}
        cells={cells}
        selected={selected}
        disabled={(cell) => done || placed[cell] !== undefined}
        onSelect={(cell) => {
          setSelected(cell);
          setFlash(null);
        }}
        corner={
          <span className="font-display font-black leading-tight" style={{ fontSize: typography.sizeRem.p11, color: done ? "var(--ds-color-text-muted)" : gold }}>
            {done ? `#${dailyNumberFor(dayKey)}` : (
              <>
                <span className="ds-tabular block" style={{ fontSize: typography.sizeRem.p20 }}>{left}</span>
                GUESSES
              </>
            )}
          </span>
        }
      />

      <Flash message={flash} />

      {!done && selected !== null ? (
        <PlayerSearch
          heading={`${puzzle.rows[Math.floor(selected / 3)].label.toUpperCase()} × ${puzzle.cols[selected % 3].label.toUpperCase()}`}
          excluded={used}
          onCancel={() => setSelected(null)}
          onPick={(careerId) => {
            const correct = isValidAnswer(puzzle, selected, careerId);
            spendGridGuess(dayKey, selected, careerId, correct);
            setFlash(correct ? { text: `✓ ${careerName(careerId).toUpperCase()}`, good: true } : { text: `✗ ${careerName(careerId).toUpperCase()} DOESN'T FIT`, good: false });
            setSelected(null);
          }}
        />
      ) : null}

      {!done && selected === null ? (
        <p className="mx-auto mt-1 w-full max-w-120 px-4 text-center text-xs leading-snug text-muted">
          Tap a cell, then name a player who played for both clubs. Every guess counts, right or wrong.
          {filled > 0 ? (
            <button type="button" onClick={() => finishGridDay(dayKey)} className="ml-1 cursor-pointer underline">
              Finish now
            </button>
          ) : null}
        </p>
      ) : null}

      {done ? <DailyResult dayKey={dayKey} cells={cells} filled={filled} /> : null}
    </>
  );
}

function DailyResult({ dayKey, cells, filled }: { dayKey: string; cells: CellView[]; filled: number }) {
  const session = useAuthSession();
  const requireAuth = useRequireAuth();
  const { countdown } = useDailyCountdown();
  const [shared, setShared] = useState<ShareOutcome | null>(null);
  const squares = [0, 1, 2].map((row) => cells.slice(row * 3, row * 3 + 3).map((cell) => (cell.tone === "filled" ? "🟩" : "⬛")).join("")).join("\n");
  const text = `StatOz Football Grid ⚽ #${dailyNumberFor(dayKey)} ${filled}/9\n${squares}`;

  return (
    <div className="mx-auto mt-4 flex w-full max-w-120 flex-col gap-2.5 px-4 pb-10">
      <p className="text-center font-display font-black leading-none" style={{ fontSize: typography.sizeRem.p27 }}>
        {filled}/9
      </p>
      <p className="ds-tabular text-center font-display font-black leading-none" style={{ fontSize: typography.sizeRem.p13, color: gold }}>
        +{gridXp(filled)} XP
      </p>
      <Button accent={violet} glow fullWidth leadingIcon={<ShareIcon size={18} />} onClick={async () => setShared(await shareResult(text))}>
        {shared === "copied" ? "COPIED TO CLIPBOARD" : shared === "shared" ? "SHARED" : "SHARE RESULT"}
      </Button>
      <Link href="/quiz/football" className="flex h-12 items-center justify-center border font-display text-xs font-black tracking-wide" style={{ color: violet, borderColor: withAlpha(violet, 0.5) }}>
        BACK TO TODAY&apos;S GAMES
      </Link>
      {session.status === "guest" ? (
        <div className="flex items-center gap-3 border p-3.5" style={{ borderColor: withAlpha(gold, 0.45), background: withAlpha(gold, 0.06) }}>
          <FlameIcon size={20} style={{ color: gold }} />
          <p className="min-w-0 flex-1 text-xs leading-snug text-muted">Log in to keep your streak and climb the leaderboard.</p>
          <button
            type="button"
            onClick={() => requireAuth({ intent: "keep your streak", message: "Log in to keep your daily streak.", returnTo: "/quiz/football" })}
            className="shrink-0 cursor-pointer px-3 py-2 font-display text-xs font-black tracking-wide text-inverse"
            style={{ background: gold }}
          >
            LOG IN
          </button>
        </div>
      ) : null}
      {countdown ? (
        <p className="ds-tabular text-center font-display font-black leading-none text-muted" style={{ fontSize: typography.sizeRem.p11, letterSpacing: "var(--ds-tracking-wide)" }}>
          NEXT GRID IN {countdown} · OR PLAY VS CPU ABOVE
        </p>
      ) : null}
    </div>
  );
}

/* ---- Versus ----------------------------------------------------------------------- */

function Versus({ seed, opponent, onRematch }: { seed: string; opponent: "cpu" | "friend"; onRematch: () => void }) {
  const puzzle = useMemo(() => gridFromSeed(seed), [seed]);
  const [marks, setMarks] = useState<(Mark | null)[]>(() => Array(9).fill(null));
  const [names, setNames] = useState<(string | null)[]>(() => Array(9).fill(null));
  const [turn, setTurn] = useState<Mark>("X");
  const [selected, setSelected] = useState<number | null>(null);
  const [flash, setFlash] = useState<{ text: string; good: boolean } | null>(null);

  const used = useMemo(() => new Set(names.filter((name): name is string => name !== null)), [names]);
  const playable = useCallback(
    (cell: number) => Boolean(puzzle) && marks[cell] === null && puzzle!.answers[cell].some((answer) => !used.has(answer)),
    [puzzle, marks, used],
  );
  const winner = winnerOf(marks);
  const stuck = !winner && marks.every((mark, cell) => mark !== null || !playable(cell));
  const over = Boolean(winner) || stuck;
  const label = (mark: Mark) => (mark === "X" ? "YOU" : opponent === "cpu" ? "CPU" : "FRIEND");
  const playerLabel = (mark: Mark) => (opponent === "friend" ? (mark === "X" ? "PLAYER 1" : "PLAYER 2") : label(mark));

  const claim = useCallback((cell: number, careerId: string, mark: Mark) => {
    setMarks((current) => current.map((value, index) => (index === cell ? mark : value)));
    setNames((current) => current.map((value, index) => (index === cell ? careerId : value)));
  }, []);

  // The computer's turn.
  useEffect(() => {
    if (opponent !== "cpu" || turn !== "O" || over || !puzzle) return;
    const id = window.setTimeout(() => {
      const cell = cpuCell(marks, playable, "O");
      if (cell === null) {
        setTurn("X");
        return;
      }
      const options = puzzle.answers[cell].filter((answer) => !used.has(answer));
      if (Math.random() < cpuAccuracy && options.length > 0) {
        const pick = options[Math.floor(Math.random() * options.length)];
        claim(cell, pick, "O");
        setFlash({ text: `CPU NAMED ${careerName(pick).toUpperCase()}`, good: false });
      } else {
        setFlash({ text: "CPU MISSED · YOUR TURN", good: true });
      }
      setTurn("X");
    }, cpuThinkMs);
    return () => window.clearTimeout(id);
  }, [opponent, turn, over, puzzle, marks, playable, used, claim]);

  if (!puzzle) return <p className="p-8 text-center text-sm text-muted">Could not deal a grid. Try a rematch.</p>;

  const cells: CellView[] = marks.map((mark, index) => ({
    label: names[index] ? `${mark} · ${careerShortName(names[index]!)}` : null,
    tone: mark === "X" ? "x" : mark === "O" ? "o" : "empty",
  }));
  const humanTurn = opponent === "friend" || turn === "X";

  return (
    <>
      <Board
        puzzle={puzzle}
        cells={cells}
        selected={selected}
        disabled={(cell) => over || !humanTurn || !playable(cell)}
        onSelect={(cell) => {
          setSelected(cell);
          setFlash(null);
        }}
        corner={
          <span className="font-display font-black leading-tight" style={{ fontSize: typography.sizeRem.p11, color: turn === "X" ? accentVar("cyan") : accentVar("orange") }}>
            {over ? "END" : (
              <>
                <span className="block" style={{ fontSize: typography.sizeRem.p20 }}>{turn}</span>
                {playerLabel(turn)}
              </>
            )}
          </span>
        }
      />

      <Flash message={flash} />

      {!over && humanTurn && selected !== null ? (
        <PlayerSearch
          heading={`${playerLabel(turn)}: ${puzzle.rows[Math.floor(selected / 3)].label.toUpperCase()} × ${puzzle.cols[selected % 3].label.toUpperCase()}`}
          excluded={used}
          onCancel={() => setSelected(null)}
          onPick={(careerId) => {
            const correct = isValidAnswer(puzzle, selected, careerId);
            if (correct) {
              claim(selected, careerId, turn);
              setFlash({ text: `✓ ${careerName(careerId).toUpperCase()}`, good: true });
            } else {
              setFlash({ text: `✗ ${careerName(careerId).toUpperCase()} DOESN'T FIT · TURN PASSES`, good: false });
            }
            setSelected(null);
            setTurn((current) => (current === "X" ? "O" : "X"));
          }}
        />
      ) : null}

      {!over && selected === null ? (
        <p className="mx-auto mt-1 w-full max-w-120 px-4 text-center text-xs leading-snug text-muted">
          {humanTurn
            ? `${playerLabel(turn)}: pick a cell and name a player. Three in a row wins; a miss passes the turn.`
            : "The computer is thinking…"}
        </p>
      ) : null}

      {over ? (
        <div className="mx-auto mt-4 flex w-full max-w-120 flex-col gap-2.5 px-4 pb-10">
          <p className="text-center font-display font-black leading-tight" style={{ fontSize: typography.sizeRem.p22, color: winner === "X" ? accentVar("cyan") : winner === "O" ? accentVar("orange") : "var(--ds-color-text-default)" }}>
            {winner ? `${playerLabel(winner)} WIN${playerLabel(winner) === "YOU" ? "" : "S"}` : "DRAW"}
          </p>
          <Button accent={violet} glow fullWidth leadingIcon={<GroupsIcon size={18} />} onClick={onRematch}>
            REMATCH ON A NEW GRID
          </Button>
        </div>
      ) : null}
    </>
  );
}
