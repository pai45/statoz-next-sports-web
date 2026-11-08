import {
  BasketballIcon,
  CricketIcon,
  FootballIcon,
  MotorsportIcon,
  TennisIcon,
  type IconProps,
} from "@statoz/design-system/web";
import type { Sport } from "@/domain/sports";

const glyphs = {
  football: FootballIcon,
  cricket: CricketIcon,
  basketball: BasketballIcon,
  tennis: TennisIcon,
  motorsport: MotorsportIcon,
} as const;

/** Resolves a sport to its glyph so callers do not switch on the union. */
export function SportIcon({ sport, ...props }: IconProps & { sport: Sport }) {
  const Glyph = glyphs[sport];
  return <Glyph {...props} />;
}
