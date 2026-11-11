"use client";

import { Button, QuizIcon, SearchIcon } from "@statoz/design-system/web";
import { sportModuleFor, sportOrder, type Sport } from "@/domain/sports";
import { fixtureCountsBySport } from "@/mocks/matches";
import styles from "./match-hub-intro.module.css";

/** A sports-focused introduction using the Games dashboard's visual hierarchy. */
export function MatchHubIntro({ sport, onSearch }: { sport: Sport | null; onSearch: () => void }) {
  const counts = fixtureCountsBySport();
  const total = sport ? counts[sport].total : sportOrder.reduce((sum, item) => sum + counts[item].total, 0);
  const label = sport ? sportModuleFor(sport).label : null;

  return (
    <section className={styles.intro} aria-labelledby="match-hub-title">
      <div className={styles.copy}>
        <p className={styles.eyebrow}>YOUR FRONT ROW TO SPORT</p>
        <h1 id="match-hub-title">{label ? `${label}. Your call.` : <>Every match.<br /><span>Your call.</span></>}</h1>
        <p className={styles.description}>Follow the fixtures, make your picks, and put your sports knowledge to the test.</p>
        <div className={styles.actions}>
          <Button onClick={onSearch} leadingIcon={<SearchIcon size={18} />}>Find a match</Button>
          <Button href={sport ? `/quiz/${sport}` : "/quiz"} variant="ghost" leadingIcon={<QuizIcon size={18} />}>Play today’s quiz</Button>
        </div>
      </div>
      <div className={styles.summary}>
        <span className={styles.kicker}>THE MATCH CENTRE</span>
        <p><strong>{total}</strong> fixtures to explore</p>
        <span>{label ?? `${sportOrder.length} sports`}. Picks. Predictions. Quiz.</span>
      </div>
    </section>
  );
}
