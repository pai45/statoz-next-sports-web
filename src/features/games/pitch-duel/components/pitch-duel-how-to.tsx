"use client";

import { useState } from "react";

import { Glyph, type GlyphName } from "@statoz/design-system/web";

import styles from "./pitch-duel.module.css";

type GuideStep = {
  icon: GlyphName;
  title: string;
  body: string;
  hint: string;
  accent: string;
};

const steps: GuideStep[] = [
  {
    icon: "style",
    title: "BUILD YOUR DECK",
    body: "Choose 2 attackers, 2 defenders, and 6 action cards to form your squad.",
    hint: "2 ATK · 2 DEF · 6 ACT",
    accent: "var(--ds-color-accent-violet)",
  },
  {
    icon: "diamond",
    title: "TOSS FOR ROLE",
    body: "Coin flip decides who attacks first. Roles alternate every round after.",
    hint: "HEADS = ATTACK · TAILS = DEFEND",
    accent: "var(--ds-color-accent-gold)",
  },
  {
    icon: "flag",
    title: "REVEAL SCENARIO",
    body: "A bonus scenario drops each round. Read it — it changes everything.",
    hint: "QUICK COUNTER · SET PIECE · 1V1 DUEL",
    accent: "var(--ds-color-accent-lime)",
  },
  {
    icon: "bolt",
    title: "LOCK YOUR MOVE",
    body: "Play 1 player card + 1 action card before the round resolves.",
    hint: "PLAYER + ACTION = POWER",
    accent: "var(--ds-color-accent-cyan)",
  },
  {
    icon: "sports_soccer",
    title: "RESOLVE THE ROUND",
    body: "Rating, action boost, scenario bonus, and a luck roll decide the outcome.",
    hint: "GOAL · SAVED · BLOCKED · FOUL",
    accent: "var(--ds-color-success)",
  },
  {
    icon: "emoji_events",
    title: "FULL-TIME VERDICT",
    body: "Highest score after 4 rounds wins. Still level? It's a draw — a small XP award for both sides.",
    hint: "WIN BIG XP · DRAW = SMALL XP",
    accent: "var(--ds-color-accent-pink)",
  },
];

const faqs: Array<{ icon: GlyphName; question: string; answer: string }> = [
  {
    icon: "replay",
    question: "Can I reuse cards?",
    answer: "Yes. Cards can be reused unless a player gets a red card.",
  },
  {
    icon: "dangerous",
    question: "What does a red card do?",
    answer: "That player card is blocked for all remaining rounds.",
  },
  {
    icon: "swap_horiz",
    question: "When do roles change?",
    answer: "After Round 1, Attack and Defense alternate automatically.",
  },
  {
    icon: "sports_soccer",
    question: "When do penalties happen?",
    answer: "Only when the match is tied after 4 rounds.",
  },
];

export function PitchDuelHowTo({ onBack }: { onBack: () => void }) {
  const [index, setIndex] = useState(0);
  const [expandedRule, setExpandedRule] = useState<number | null>(null);
  const step = steps[index];

  return (
    <section className={styles.howTo} aria-labelledby="how-to-title">
      <header className={styles.simpleHeader}>
        <button type="button" onClick={onBack} aria-label="Back to Pitch Duel lobby">
          <Glyph name="chevron_left" size={22} />
        </button>
        <i className={styles.guideSlash} aria-hidden />
        <div>
          <h1 id="how-to-title">HOW TO PLAY</h1>
          <p>{"// Master the 4-Round Duel"}</p>
        </div>
      </header>

      <div className={styles.howToBody}>
        <div className={styles.overviewStrip}>
          <Overview icon="groups" label="4 ROUNDS" copy="1 move each" accent="cyan" />
          <Overview icon="style" label="PICK CARDS" copy="Player + Action" accent="violet" />
          <Overview icon="emoji_events" label="OUTSCORE" copy="Win the duel" accent="gold" />
        </div>

        <div className={styles.howToTitleRow}>
          <b>HOW IT WORKS</b>
          <span>{index + 1} / {steps.length}</span>
        </div>

        <article
          className={styles.stepCard}
          style={{ "--step-accent": step.accent } as React.CSSProperties}
        >
          <div className={styles.stepHeading}>
            <span><Glyph name={step.icon} size={27} /></span>
            <div>
              <b>STEP {String(index + 1).padStart(2, "0")}</b>
              <h2>{step.title}</h2>
            </div>
          </div>
          <p>{step.body}</p>
          <strong>{step.hint}</strong>
        </article>

        <div className={styles.stepNav} aria-label="Guide steps">
          {steps.map((item, itemIndex) => (
            <button
              key={item.title}
              type="button"
              aria-label={`Show step ${itemIndex + 1}: ${item.title}`}
              aria-pressed={itemIndex === index}
              onClick={() => setIndex(itemIndex)}
              style={itemIndex === index ? { "--step-dot": step.accent } as React.CSSProperties : undefined}
            />
          ))}
        </div>

        <PowerCheck />

        <section className={styles.quickRules} aria-labelledby="quick-rules-title">
          <h2 id="quick-rules-title">QUICK RULES</h2>
          {faqs.map((faq, faqIndex) => {
            const expanded = expandedRule === faqIndex;
            return (
              <div className={styles.rule} key={faq.question}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`pitch-duel-rule-${faqIndex}`}
                  onClick={() => setExpandedRule(expanded ? null : faqIndex)}
                >
                  <Glyph name={faq.icon} size={16} />
                  <b>{faq.question}</b>
                  <Glyph name={expanded ? "chevron_left" : "chevron_right"} size={17} />
                </button>
                {expanded ? <p id={`pitch-duel-rule-${faqIndex}`}>{faq.answer}</p> : null}
              </div>
            );
          })}
        </section>
      </div>
    </section>
  );
}

function Overview({
  icon,
  label,
  copy,
  accent,
}: {
  icon: GlyphName;
  label: string;
  copy: string;
  accent: "cyan" | "violet" | "gold";
}) {
  return (
    <div style={{ "--overview-accent": `var(--ds-color-accent-${accent})` } as React.CSSProperties}>
      <Glyph name={icon} size={22} />
      <b>{label}</b>
      <span>{copy}</span>
    </div>
  );
}

function PowerCheck() {
  const items: Array<{ icon: GlyphName; label: string; accent: string }> = [
    { icon: "person_pin_circle", label: "RATING", accent: "cyan" },
    { icon: "bolt", label: "ACTION", accent: "gold" },
    { icon: "star", label: "BONUS", accent: "lime" },
    { icon: "diamond", label: "LUCK", accent: "violet" },
  ];

  return (
    <section className={styles.powerFormula} aria-labelledby="power-check-title">
      <h2 id="power-check-title">POWER CHECK</h2>
      <div className={styles.formulaItems}>
        {items.map((item, itemIndex) => (
          <div className={styles.formulaItem} key={item.label}>
            {itemIndex > 0 ? <i aria-hidden>+</i> : null}
            <span style={{ "--formula-accent": `var(--ds-color-accent-${item.accent})` } as React.CSSProperties}>
              <Glyph name={item.icon} size={20} />
              <b>{item.label}</b>
            </span>
          </div>
        ))}
      </div>
      <p>Smart picks improve your odds. Risky cards can win big — or punish you.</p>
    </section>
  );
}
