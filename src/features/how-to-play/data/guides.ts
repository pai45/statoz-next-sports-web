import type { ModeGuide } from "../types";

/**
 * The seven guides, in hub order: the two platform surfaces first, then the
 * games. Copy is the app's, verbatim — this is reference material, and a guide
 * that paraphrases the rules is a guide that drifts from them.
 *
 * The app's `Cyber.red` (#e31f26) opens only once, on the bingo lives counter.
 * It is a second danger red for one stat cell, so it resolves here to the
 * danger token the palette already carries.
 */
export const guides: ModeGuide[] = [
  // ── Predict ────────────────────────────────────────────────────────────────
  {
    id: "predict",
    title: "PREDICT",
    tagline: "Answer the match quiz, earn XP",
    subtitle: "// MATCH QUIZ · XP ONLY",
    purpose:
      "Study a real fixture, answer a short quiz before kickoff, and earn XP when the match settles.",
    icon: "quiz",
    accent: "cyan",
    stats: [
      { icon: "style", label: "ONE AT A TIME", sub: "question per page", accent: "cyan" },
      { icon: "bolt", label: "BOOSTERS", sub: "2× and 1.5×", accent: "orange" },
      { icon: "military_tech", label: "XP ONLY", sub: "never coins", accent: "violet" },
    ],
    steps: [
      {
        title: "Open Matches",
        body: "Fixtures are grouped by league. Tap a predictable upcoming match to start its quiz.",
      },
      {
        title: "Answer the quiz",
        body: "One question per page — exact score or multiple choice. NEXT unlocks once you answer the current question.",
      },
      {
        title: "Boost your best calls",
        body: "Place one 2× and one 1.5× booster on answered questions to multiply their XP. Move or remove them until predictions lock.",
      },
      {
        title: "Lock at kickoff",
        body: "Answers stay editable until the match starts, then the screen turns read-only and shows crowd vote results.",
      },
      {
        title: "Reveal the results",
        body: "When the match finishes, tap REVEAL RESULTS for the settlement cinematic. Correct answers credit XP to your progression.",
      },
    ],
    facts: [
      {
        icon: "military_tech",
        label: "XP, never coins",
        body: "Predictions only ever pay XP into your shared level track.",
      },
      {
        icon: "edit",
        label: "Edit until kickoff",
        body: "Re-open a prediction any time before the match starts to change answers.",
      },
      {
        icon: "history",
        label: "Review, not replay",
        body: "A match you already predicted opens as a review list, not a fresh quiz.",
      },
    ],
  },

  // ── Pick ───────────────────────────────────────────────────────────────────
  {
    id: "pick",
    title: "PICK",
    tagline: "Take a position on outcome markets",
    subtitle: "// OUTCOME MARKETS · OZ COINS",
    purpose:
      "Browse outcome markets, choose a price, and confirm an Oz Coin amount on your call.",
    icon: "show_chart",
    accent: "lime",
    stats: [
      { icon: "tune", label: "FILTERS", sub: "sport + market", accent: "lime" },
      { icon: "sell", label: "PRICED", sub: "per outcome", accent: "cyan" },
      { icon: "paid", label: "OZ COINS", sub: "your stake", accent: "gold" },
    ],
    steps: [
      {
        title: "Browse markets",
        body: "Filter by sport (IPL, EPL, NBA…) and by market type — All Picks, Matches, Event, or Futures.",
      },
      {
        title: "Read the card",
        body: "Each market shows the league, the question, close time, volume, and a price for every outcome.",
      },
      {
        title: "Tap an outcome price",
        body: "A confirmation sheet opens with your pick, its price, and your available balance.",
      },
      {
        title: "Set your amount",
        body: "Adjust the stake in price-step increments — it always stays inside your balance.",
      },
      {
        title: "Confirm the pick",
        body: "Lock it in. A short success message confirms your position.",
      },
    ],
    facts: [
      {
        icon: "sports_soccer",
        label: "Match market",
        body: "Pick the result of a live or upcoming match.",
      },
      {
        icon: "quiz",
        label: "Binary event",
        body: "A yes/no question — qualification, a player playing, and so on.",
      },
      {
        icon: "trending_up",
        label: "Futures",
        body: "A longer-range outcome with several possible winners.",
      },
    ],
  },

  // ── Pitch Duel ─────────────────────────────────────────────────────────────
  {
    id: "pitch-duel",
    title: "PITCH DUEL",
    tagline: "Tactical 4-round card duel",
    subtitle: "// TACTICAL 4-ROUND DUEL",
    purpose:
      "Turn your card collection into a four-round tactical match — outscore the CPU for XP and coins.",
    icon: "sports_soccer",
    accent: "violet",
    stats: [
      { icon: "sync_alt", label: "4 ROUNDS", sub: "attack ×2 · defend ×2", accent: "violet" },
      { icon: "style", label: "PLAYER + ACTION", sub: "each round", accent: "cyan" },
      { icon: "emoji_events", label: "XP & COINS", sub: "on a win", accent: "gold" },
    ],
    steps: [
      {
        title: "Build a legal deck",
        body: "2 attackers, 2 defenders, 1 goalkeeper, and 6 action cards.",
      },
      {
        title: "Toss for role",
        body: "A coin flip sets who attacks first; roles alternate, so you attack twice and defend twice across the match.",
      },
      {
        title: "Read the scenario",
        body: "Each round drops a football scenario — counter, set piece, box defense — that tilts the attack vs defense power.",
      },
      {
        title: "Pick player + action",
        body: "Choose a role-appropriate player card and one action card for the round.",
      },
      {
        title: "Strike the Shot Meter",
        body: "Tap to stop the sweeping marker. Perfect timing adds up to +20 power to your side.",
      },
      {
        title: "Resolve and repeat",
        body: "The power gap becomes a goal, save, block, miss, foul, or red card. Highest score after 4 rounds wins.",
      },
    ],
    facts: [
      {
        icon: "insights",
        label: "Power formula",
        body: "Card rating + action power + scenario bonus + a 0–20 swing.",
      },
      {
        icon: "warning",
        label: "Risky actions",
        body: "Carry a 12% chance of a foul (attack) or a red card (defense).",
      },
      {
        icon: "sports_soccer",
        label: "Tied at full time",
        body: "A level match after 4 rounds goes to a penalty shootout.",
      },
    ],
  },

  // ── Penalty Shootout ───────────────────────────────────────────────────────
  {
    id: "penalty-shootout",
    title: "PENALTY SHOOTOUT",
    tagline: "Sudden-death spot kicks",
    subtitle: "// SUDDEN-DEATH SPOT KICKS",
    purpose:
      "Your five-man lineup trades spot kicks with the CPU — outsmart the keeper to win.",
    icon: "my_location",
    accent: "orange",
    stats: [
      {
        icon: "format_list_numbered",
        label: "5 KICKS EACH",
        sub: "then sudden death",
        accent: "orange",
      },
      { icon: "swap_horiz", label: "L · C · R", sub: "aim your shot", accent: "cyan" },
      { icon: "shield", label: "RATINGS MATTER", sub: "tip each duel", accent: "lime" },
    ],
    steps: [
      {
        title: "Set your lineup",
        body: "Your five squad players line up in kick order — higher ratings convert their kicks more often.",
      },
      {
        title: "Pick a direction",
        body: "Aim left, center, or right by tapping a goal zone. The keeper dives at the same moment.",
      },
      {
        title: "Beat the keeper",
        body: "You score when your direction differs from the keeper's dive.",
      },
      {
        title: "Trade kicks",
        body: "You and the CPU alternate kicks. Your keeper guards the net on the CPU's turn.",
      },
      {
        title: "Sudden death",
        body: "Level after five kicks each? Sudden-death pairs decide it.",
      },
    ],
    facts: [
      {
        icon: "shield",
        label: "Ratings tip the duel",
        body: "A stronger kicker beats the keeper more reliably.",
      },
      {
        icon: "flash_on",
        label: "Early finish",
        body: "The round can end as soon as one side can no longer catch up.",
      },
      {
        icon: "sports_soccer",
        label: "Standalone mode",
        body: "Played on its own from the Games tab — not tied to a card match.",
      },
    ],
  },

  // ── Bingo Grid ─────────────────────────────────────────────────────────────
  {
    id: "football-bingo",
    title: "BINGO GRID",
    tagline: "Match the player to the intersecting clubs",
    subtitle: "// DAILY 3X3 GRID",
    purpose:
      "Test your football knowledge by matching the active player to the correct intersecting clubs. Complete the daily 3x3 grid without running out of lives.",
    icon: "grid_on",
    accent: "orange",
    stats: [
      { icon: "grid_view", label: "9 CELLS", sub: "3x3 daily puzzle", accent: "orange" },
      { icon: "favorite", label: "5 LIVES", sub: "don't tap wrong", accent: "danger" },
      { icon: "timer", label: "DAILY", sub: "new grid tomorrow", accent: "cyan" },
    ],
    steps: [
      {
        title: "Check the Active Player",
        body: "The panel shows a player. Your goal is to find the one cell they belong to.",
      },
      {
        title: "Match the criteria",
        body: "Look at the row and column clubs. The active player must have played senior football for both. Correct picks unlock their route.",
      },
      {
        title: "Tap to place",
        body: "Tap the intersecting cell. A correct guess locks the player in and gives you the next one.",
      },
      {
        title: "Watch your lives",
        body: "You start with 5 lifelines. A wrong guess burns a life and shows a red error.",
      },
      {
        title: "Buy a lifeline",
        body: "Run out of lives? You can buy an extra lifeline for 25 Oz Coins to keep playing.",
      },
      {
        title: "Complete the grid",
        body: "Fill all 9 cells to finish the daily puzzle. Archives are view-only.",
      },
    ],
    facts: [
      { icon: "timer", label: "Daily Refresh", body: "A new grid unlocks every day." },
      { icon: "paid", label: "Lifeline cost", body: "25 Oz Coins to revive." },
      {
        icon: "history",
        label: "Archive mode",
        body: "Past grids can be viewed but not played.",
      },
    ],
  },

  // ── Football Chess ─────────────────────────────────────────────────────────
  {
    id: "football-chess",
    title: "FOOTBALL CHESS",
    tagline: "Tactical 5v5 Grid Duel",
    subtitle: "// TURN-BASED MATCH",
    purpose:
      "Chess on a pitch. Take turns to move, pass, dribble, or shoot. Defend using press, tackle, or slide to win back possession and score from the opponent's half.",
    icon: "grid_view",
    accent: "cyan",
    stats: [
      { icon: "grid_on", label: "3X4 GRID", sub: "tight tactical pitch", accent: "cyan" },
      { icon: "groups", label: "5V5 SQUAD", sub: "4 outfield + 1 keeper", accent: "lime" },
      { icon: "timer", label: "COOLDOWNS", sub: "manage your tackles", accent: "orange" },
    ],
    steps: [
      {
        title: "Move & Pass",
        body: "Move a player 1 square in any direction. Pass the ball in a clear straight line to a teammate. Keepers can pass to anyone!",
      },
      {
        title: "Dribble",
        body: "Have the ball? Dribble into an adjacent opponent to beat them and keep possession.",
      },
      {
        title: "Press & Tackle",
        body: "Press to move a defender closer to the ball carrier from range. Tackle an adjacent carrier to win the ball back cleanly.",
      },
      {
        title: "Slide Tackle",
        body: "Higher chance to win the ball, but risks a foul or a card! Missed slides have a longer cooldown.",
      },
      {
        title: "Shoot to Score",
        body: "Once in the opponent's half, you can shoot! Your player's attack is matched against the enemy goalkeeper's defense.",
      },
    ],
    facts: [
      {
        icon: "workspace_premium",
        label: "XP Only",
        body: "This mode rewards XP for progression. Coins stay in the shop.",
      },
    ],
  },

  // ── Hoop Duel ──────────────────────────────────────────────────────────────
  {
    id: "hoop-duel",
    title: "HOOP DUEL",
    tagline: "Street 1-on-1 arcade basketball",
    subtitle: "// REAL-TIME DUEL · XP ONLY",
    purpose:
      "Two 45-second halves of half-court 1-on-1. Move with the arrows, and one contextual ACTION pad does everything else — shots, fakes, steals and blocks — depending on where you are and what's happening.",
    icon: "sports_basketball",
    accent: "gold",
    stats: [
      { icon: "timer", label: "2 HALVES", sub: "45s + halftime sub", accent: "gold" },
      { icon: "schedule", label: "12s CLOCK", sub: "shoot before it dies", accent: "danger" },
      {
        icon: "local_fire_department",
        label: "HEAT",
        sub: "fill it to ignite",
        accent: "orange",
      },
    ],
    steps: [
      {
        title: "Move & Drive",
        body: "Hold ◀ ▶ to move. Double-tap a direction to burst-drive at the rim; double-tap again mid-drive to spin. Quick direction flips are crossovers — they shake defenders but expose the ball for a beat.",
      },
      {
        title: "Shoot on the meter",
        body: "Hold ACTION to rise, release at the green band for a PERFECT shot. Feet beyond the arc line = 3 points. Tired legs shrink the perfect window.",
      },
      {
        title: "Finish inside",
        body: "Tap ACTION on the move near the rim for a layup. Hold it through a burst-drive for a dunk — dunks always slam home unless a big body meets you up there.",
      },
      {
        title: "Create space",
        body: "Tap while standing to pump fake — a defender who bites is left staggering. Swipe the pad away from the rim for a step-back jumper.",
      },
      {
        title: "Defend with timing",
        body: "Hold ACTION near the handler for a defensive stance, tap to jab a steal at exposed dribbles, and hold-release as the shooter rises to leap for the block. Whiffed lunges leave you beat.",
      },
      {
        title: "Crash the boards",
        body: "Misses are live — track the drop marker and tap ACTION to leap for the rebound. An offensive board opens a quick put-back window; there is no clear-the-ball step.",
      },
    ],
    facts: [
      {
        icon: "local_fire_department",
        label: "Heat",
        body: "Baskets, defensive stops and offensive boards build heat. Fill the meter — or score 6 unanswered points — for 15 seconds of faster movement, a wider perfect window, steadier stamina and a shot boost. An opponent score ends it.",
      },
      {
        icon: "groups",
        label: "Roster of 3",
        body: "Pick three athletes; one plays at a time. The bench rests to full — sub fresh legs at halftime.",
      },
      {
        icon: "workspace_premium",
        label: "XP Only",
        body: "This mode rewards XP for progression. Coins stay in the shop.",
      },
    ],
  },
];

/** The guide for a mode, or `undefined` when the slug names no mode. */
export function guideFor(mode: string): ModeGuide | undefined {
  return guides.find((guide) => guide.id === mode);
}
