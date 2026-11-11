"use client";

import { accentVar, FilterChips, MoreIcon, SearchIcon } from "@statoz/design-system/web";
import { sportModuleFor, sportOrder, type Sport } from "@/domain/sports";
import styles from "./sport-hub-tabs.module.css";

/** null shows the editorial feed; a sport narrows the fixtures. */
export type SportHubSelection = Sport | null;
export type SportHubTabsProps = {
  selected: SportHubSelection;
  onSelect: (selection: SportHubSelection) => void;
  onMore?: () => void;
  onSearch?: () => void;
};
const labelFor = (sport: Sport) => sport === "basketball" ? "Basketball" : sportModuleFor(sport).label;

/** The dashboard's outlined sport chips, with every Sports destination available. */
export function SportHubTabs({ selected, onSelect, onMore, onSearch }: SportHubTabsProps) {
  return (
    <div className={styles.bar}>
      <div className={styles.inner}>
        <FilterChips
          label="Browse by sport"
          options={["Trending", ...sportOrder.map(labelFor)]}
          selected={selected ? labelFor(selected) : "Trending"}
          accent={accentVar(selected ? sportModuleFor(selected).accent : "cyan")}
          onSelect={label => onSelect(sportOrder.find(sport => labelFor(sport) === label) ?? null)}
          className={styles.chips}
        />
        <div className={styles.tools}>
          {onMore && <button type="button" onClick={onMore} aria-label="Explore all sports" title="Explore all sports"><MoreIcon size={21} /></button>}
          {onSearch && <button type="button" onClick={onSearch} aria-label="Search teams and leagues" title="Search teams and leagues"><SearchIcon size={21} /></button>}
        </div>
      </div>
    </div>
  );
}
