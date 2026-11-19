"use client";
import Link from 'next/link';
import type {SportMatch} from '@/domain/matches';
import type {PredictionQuiz} from '@/domain/predictions';
import {useEditorialEntrance} from '../editorial-entrance';
import {TeamBadge} from './team-badge';
import {LockIcon, PremiumIcon} from '@statoz/design-system/web';
import styles from './editorial-discovery.module.css';

/** Keep the sealed entry identifiable before its result is revealed. */
export function EditorialRevealCard({match,quiz,onOpen}:{match:SportMatch;quiz:PredictionQuiz;onOpen?:()=>void}) {
  const entrance=useEditorialEntrance('reveal:'+match.id+':'+quiz.id);
  const identity=match.sport==='motorsport'?match.home.name:match.home.name+' vs '+match.away.name;
  const content=<><span className={styles.revealIdentity}>{match.sport!=='motorsport'&&<span className={styles.revealTeams}><TeamBadge team={match.home} size={36}/><span>vs</span><TeamBadge team={match.away} size={36}/></span>}<strong>{identity}</strong><small>{quiz.title} · {quiz.questions.length} predictions sealed</small></span><span className={styles.revealAction}><LockIcon size={16} aria-hidden="true"/><span>Reveal result</span><PremiumIcon size={18} aria-hidden="true"/></span></>;
  const label='Reveal '+quiz.title+' for '+identity;
  return onOpen?<button ref={entrance} type="button" className={styles.reveal} onClick={onOpen} aria-label={label} data-kind="reveal">{content}</button>:
    <Link ref={entrance} href={'/matches/'+match.id+'/predict/'+quiz.id} className={styles.reveal} aria-label={label} data-kind="reveal">{content}</Link>;
}
