import test from 'node:test';
import assert from 'node:assert/strict';
import { isGameEnabled, isQuizGame } from '../src/domain/demo-product';
import { sportGameDecks } from '../src/mocks/games/sport-decks';
import { playableGameHrefs, gameForHref } from '../src/mocks/games/game-registry';
test('catalog and direct play routes respect product ownership',()=>{ for(const ids of Object.values(sportGameDecks)) for(const id of ids) assert.ok(isGameEnabled(id)); for(const href of playableGameHrefs()) assert.ok(isGameEnabled(gameForHref(href)!.game)); assert.equal(isGameEnabled('football-bingo'),true); assert.equal(isGameEnabled('retro-hoops'),false); assert.ok(isQuizGame('guess-driver')); assert.ok(isQuizGame('tennis-guess-winner')); });
