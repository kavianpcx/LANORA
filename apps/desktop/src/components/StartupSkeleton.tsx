import brand from "../brand.svg";
import { labels } from "../labels";
import type { Lang } from "../types";

export function StartupSkeleton({
  lang,
  visible,
}: {
  lang: Lang;
  visible: boolean;
}) {
  const message = lang === "fa" ? "در حال آماده‌سازی LANORA…" : "Getting LANORA ready…";
  return (
    <div
      className={`startup-skeleton${visible ? " is-visible" : ""}`}
      data-lang={lang}
      dir="ltr"
      role="status"
      aria-label={message}
      aria-busy="true"
    >
      <div className="startup-titlebar" aria-hidden="true">
        <div className="startup-title-brand">
          <img src={brand} alt="" />
          <b>LANORA</b>
          <span className="startup-block startup-version" />
        </div>
        <span className="startup-block startup-status" />
        <span className="startup-profile">
          <span className="startup-block startup-avatar" />
          <span className="startup-block startup-name" />
        </span>
        <span className="startup-window-controls">
          <i />
          <i />
          <i />
        </span>
      </div>
      <div className="startup-app" aria-hidden="true">
        <aside className="startup-sidebar">
          <div className="startup-side-brand">
            <img src={brand} alt="" />
            <div>
              <b>LANORA</b>
              <small>{lang === "fa" ? "شبکهٔ خصوصی بازی" : "PRIVATE GAME NETWORK"}</small>
            </div>
          </div>
          <span className="startup-divider" />
          <span className="startup-block startup-side-heading" />
          <span className="startup-block startup-side-row" />
          <span className="startup-block startup-side-row" />
          <span className="startup-block startup-side-row" />
          <div className="startup-side-spacer" />
          <span className="startup-block startup-side-tip" />
        </aside>
        <main className="startup-main">
          <div className="startup-block startup-eyebrow" />
          <span className="startup-block startup-heading" />
          <span className="startup-block startup-subheading" />
          <section className="startup-card">
            <span className="startup-block startup-card-title" />
            <div className="startup-card-form">
              <span className="startup-block startup-input" />
              <span className="startup-block startup-button" />
            </div>
            <span className="startup-block startup-card-footnote" />
          </section>
          <div className="startup-dashboard">
            <section className="startup-card startup-ip-card">
              <span className="startup-block startup-card-title" />
              <span className="startup-block startup-ip-value" />
              <span className="startup-block startup-line" />
            </section>
            <section className="startup-card startup-player-card">
              <span className="startup-block startup-card-title" />
              <div className="startup-player-row">
                <span className="startup-block startup-avatar" />
                <span className="startup-block startup-player-name" />
              </div>
              <div className="startup-player-row">
                <span className="startup-block startup-avatar" />
                <span className="startup-block startup-player-name" />
              </div>
            </section>
          </div>
          <span className="startup-sr-copy">{labels[lang].checking}</span>
        </main>
      </div>
    </div>
  );
}
