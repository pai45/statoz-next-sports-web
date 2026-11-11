import { HomeHubSurface } from "@/features/shell/components/home-hub-surface";
import { PlatformBreadcrumbs, PlatformTopBar } from "@/features/shell";
import styles from "@/features/shell/components/platform-frame.module.css";
import { PlatformPrimaryNav } from "@/features/shell/components/platform-primary-nav";

/** One command bar across Sports; match and quiz experiences keep their content. */
export default function PlatformLayout({ children }: LayoutProps<"/">) {
  return (
    <div className={styles.frame}>
      <a href="#platform-content" className={styles.skip}>Skip to content</a>
      <PlatformTopBar />
      <HomeHubSurface>
        <PlatformBreadcrumbs />
        <main id="platform-content" className={styles.main}>{children}</main>
      </HomeHubSurface>
      <PlatformPrimaryNav mobile />
    </div>
  );
}
