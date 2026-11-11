"use client";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { type PickMarket } from "@/domain/predictions";
import styles from "./editorial-discovery.module.css";
import { EditorialMarketCard } from "./editorial-market-card";

const SLIDE_KEY = "statoz.next.sports-web.featured-pick-slide";
/** Mouse travel (px) before a press turns into a drag, so plain clicks still reach the cards. */
const DRAG_THRESHOLD = 6;

function saveSlide(index: number) {
  try {
    sessionStorage.setItem(SLIDE_KEY, String(index));
  } catch { }
}

function scrollBehavior(): ScrollBehavior {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
}

/** Distance between the start edges of neighbouring slides. */
function slideStep(rail: HTMLElement) {
  const first = rail.children[0] as HTMLElement | undefined;
  if (!first) return 0;
  return first.getBoundingClientRect().width + (parseFloat(getComputedStyle(rail).columnGap) || 0);
}

/** Whole slides that fit in the rail at once. */
function visibleSlides(rail: HTMLElement) {
  const step = slideStep(rail);
  if (!step) return 1;
  const style = getComputedStyle(rail);
  const inner = rail.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const gap = parseFloat(style.columnGap) || 0;
  return Math.max(1, Math.floor((inner + gap + 1) / step));
}

export function FeaturedPicks({ markets, onPick }: {
    markets: PickMarket[];
    onPick: (market: PickMarket, id: string) => void;
}) {
    const rail = useRef<HTMLDivElement>(null);
    const drag = useRef<{ pointer: number; x: number; left: number; moved: boolean } | null>(null);
    const swallowClick = useRef(false);
    const release = useRef(0);
    const [active, setActive] = useState(0);
    const [visible, setVisible] = useState(1);
    // One indicator per resting position, so a wide rail showing three cards gets fewer dots.
    const stops = Math.max(1, markets.length - visible + 1);
    const current = Math.min(active, stops - 1);
    const marketIds = markets.map(m => m.id).join(",");

    useEffect(() => {
        const node = rail.current;
        if (!node) return;
        let saved = 0;
        try {
            saved = Number(sessionStorage.getItem(SLIDE_KEY)) || 0;
        } catch { }
        const measure = () => setVisible(visibleSlides(node));
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(node);
        const frame = requestAnimationFrame(() => {
            node.scrollLeft = Math.max(0, Math.min(saved, markets.length - 1)) * slideStep(node);
        });
        return () => { cancelAnimationFrame(frame); observer.disconnect(); };
    }, [marketIds, markets.length]);

    if (!markets.length)
        return null;

    function show(index: number) {
        const node = rail.current;
        if (!node) return;
        const next = Math.max(0, Math.min(stops - 1, index));
        node.scrollTo({ left: next * slideStep(node), behavior: scrollBehavior() });
        setActive(next);
        saveSlide(next);
    }

    function startDrag(e: PointerEvent<HTMLDivElement>) {
        if (e.pointerType !== "mouse" || e.button !== 0) return;
        drag.current = { pointer: e.pointerId, x: e.clientX, left: e.currentTarget.scrollLeft, moved: false };
    }

    function moveDrag(e: PointerEvent<HTMLDivElement>) {
        const state = drag.current;
        if (!state || state.pointer !== e.pointerId) return;
        const node = e.currentTarget;
        const dx = e.clientX - state.x;
        if (!state.moved) {
            if (Math.abs(dx) < DRAG_THRESHOLD) return;
            state.moved = true;
            release.current += 1;
            node.setPointerCapture(e.pointerId);
            node.dataset.dragging = "true";
            window.getSelection()?.removeAllRanges();
        }
        node.scrollLeft = state.left - dx;
    }

    function endDrag(e: PointerEvent<HTMLDivElement>) {
        const state = drag.current;
        if (!state || state.pointer !== e.pointerId) return;
        drag.current = null;
        if (!state.moved) return;
        const node = e.currentTarget;
        // The click that follows a drag must not open a card.
        swallowClick.current = true;
        setTimeout(() => { swallowClick.current = false; }, 0);
        // Lean towards the drag direction so a short flick still moves one card.
        const step = slideStep(node);
        const travelled = node.scrollLeft - state.left;
        const target = step ? Math.round(node.scrollLeft / step + Math.sign(travelled) * 0.35) : 0;
        // Snapping stays off until the glide ends, or it would jump to the nearest card mid-way.
        const token = release.current;
        const resume = () => { if (release.current === token && !drag.current) delete node.dataset.dragging; };
        node.addEventListener("scrollend", resume, { once: true });
        setTimeout(resume, 700);
        show(target);
    }

    return <section className={styles.featured} aria-label="Featured winner Picks">
    <div className={styles.carousel} ref={rail} tabIndex={0} style={{ "--count": markets.length } as CSSProperties}
      onKeyDown={e => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        show(current + (e.key === "ArrowRight" ? 1 : -1));
      } }}
      onScroll={e => { const step = slideStep(e.currentTarget); if (!step) return; const index = Math.max(0, Math.min(stops - 1, Math.round(e.currentTarget.scrollLeft / step))); if (index !== current) {
        setActive(index);
        saveSlide(index);
      } }}
      onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag}
      onDragStart={e => e.preventDefault()}
      onClickCapture={e => { if (swallowClick.current) {
        e.preventDefault();
        e.stopPropagation();
        swallowClick.current = false;
      } }}>
      {markets.map(market => <div className={styles.slide} key={market.id}><EditorialMarketCard market={market} onPick={onPick} featured/></div>)}
    </div>{stops > 1 && <div className={styles.indicators}>{Array.from({ length: stops }, (_, i) => <button type="button" key={markets[i].id} aria-label={`Show featured Pick ${i + 1}`} aria-current={i === current ? "true" : undefined} onClick={() => show(i)}/>)}</div>}
  </section>;
}
