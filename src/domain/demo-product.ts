export const demoProduct = "sports" as const;
export const demoOnly = true;
export const quizGameIds = ['football-quiz','cricket-quiz','basketball-quiz','motorsport-quiz','tennis-quiz','football-bingo','guess-player','cricket-guess-player','basketball-guess-player','guess-driver','tennis-guess-winner'] as const;
export function isQuizGame(id:string):boolean { return (quizGameIds as readonly string[]).includes(id); }
export function isGameEnabled(id:string):boolean { return isQuizGame(id); }
export function isTrackEnabled(id:string):boolean { return ['quiz','guessPlayer','predictions','picks','bingo'].includes(id); }
