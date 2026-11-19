"use client";

import Image from "next/image";
import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from "react";
import { ArrowLeftIcon, CloseIcon, StarIcon, StarOutlineIcon, accentVar } from "@statoz/design-system/web";
import { sportModuleFor, type Sport } from "@/domain/sports";
import { publicAsset } from "@/shared/config";
import styles from "./arena.module.css";

export const sportNames: Record<Sport, string> = { football: "Football", cricket: "Cricket", basketball: "Basketball", tennis: "Tennis", motorsport: "Motorsport" };
export function arenaTheme(sport: Sport): CSSProperties { return { "--arena-accent": accentVar(sportModuleFor(sport).accent) } as CSSProperties; }

export function ArenaBackdrop({ sport, hero = false }: { sport: Sport; hero?: boolean }) {
  return <div className={hero ? styles.heroArt : styles.backdrop} aria-hidden="true" data-sport={sport}>
    <Image src={publicAsset(`/assets/backgrounds/hub/${sport}-wide.svg`)} alt="" fill unoptimized sizes="100vw" loading={hero ? "eager" : "lazy"} className={styles.world} />
    {hero && <Image src={publicAsset(`/assets/games/discovery/${sport}-quiz-subject.svg`)} alt="" fill unoptimized sizes="(min-width: 900px) 60vw, 100vw" className={styles.subject} />}
    <div className={styles.artVeil} />
  </div>;
}

export function ArenaHeader({ sport, title, onBack, children }: { sport: Sport; title: string; onBack: () => void; children?: ReactNode }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [title]);
  return <header className={styles.header}>
    <button className={styles.iconButton} onClick={onBack} aria-label={title === "Knowledge Arena" ? "Leave the quiz" : "Back to categories"}><ArrowLeftIcon size={21} /></button>
    <div className={styles.headerIdentity}><span>{sportNames[sport]} / Quiz</span><h1 ref={heading} tabIndex={-1}>{title}</h1></div>
    <div className={styles.headerActions}>{children}</div>
  </header>;
}

export function ArenaDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => { dialog.close(); previous?.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={ref} className={styles.dialog} aria-labelledby={id} onKeyDown={event => {
    if (event.key !== "Tab") return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')).filter(node => node.getClientRects().length > 0);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={styles.dialogBody}>
      <div className={styles.dialogHeading}><h2 id={id}>{title}</h2><button className={styles.iconButton} aria-label={`Close ${title}`} onClick={onClose}><CloseIcon size={22} /></button></div>
      {children}
    </div>
  </dialog>;
}

export function ArenaStars({ count, large = false }: { count: number; large?: boolean }) {
  return <span className={`${styles.stars} ${large ? styles.largeStars : ""}`} aria-label={`${count} of 3 mastery stars`}>
    {[0, 1, 2].map(index => <span key={index} aria-hidden="true" data-earned={index < count}>{index < count ? <StarIcon size={large ? 38 : 14} /> : <StarOutlineIcon size={large ? 38 : 14} />}</span>)}
  </span>;
}
