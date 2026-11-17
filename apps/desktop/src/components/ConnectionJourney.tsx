import { Check } from "lucide-react";
import { labels } from "../labels";
import type { ConnectionStage } from "../connectionStatus";
import type { Lang } from "../types";

export function ConnectionJourney({
  stage,
  lang,
}: {
  stage: ConnectionStage;
  lang: Lang;
}) {
  if (!["server", "authenticating", "authorized", "tunnel"].includes(stage))
    return null;

  const t = labels[lang];
  const accessDone = ["authorized", "tunnel", "connected"].includes(stage);
  const networkDone = stage === "connected";
  const steps = [
    {
      label: lang === "fa" ? "سرور" : "Server",
      done: stage !== "server",
      current: stage === "server",
    },
    {
      label: lang === "fa" ? "دسترسی بازیکن" : "Player access",
      done: accessDone,
      current: stage === "authenticating" || stage === "authorized",
    },
    {
      label: lang === "fa" ? "شبکهٔ مجازی" : "Virtual network",
      done: networkDone,
      current: stage === "tunnel",
    },
  ];
  const message =
    stage === "server"
      ? t.checking
      : stage === "authenticating"
        ? t.authenticating
        : stage === "authorized"
          ? t.accessApproved
          : t.connectingNetwork;

  return (
    <div className="connection-journey" role="status" aria-live="polite" aria-atomic="true">
      <div className="connection-steps" aria-hidden="true">
        {steps.map((step, index) => (
          <div className="connection-step-wrap" key={step.label}>
            <div className={`connection-step${step.done ? " done" : ""}${step.current ? " current" : ""}`}>
              <span className="connection-step-mark">
                {step.done ? <Check size={13} strokeWidth={2.5} /> : index + 1}
              </span>
              <small dir={lang === "fa" ? "rtl" : "ltr"}>{step.label}</small>
            </div>
            {index < steps.length - 1 && (
              <span className={`connection-step-line${step.done ? " done" : ""}`} />
            )}
          </div>
        ))}
      </div>
      <p dir={lang === "fa" ? "rtl" : "ltr"}>
        <span className="connection-indicator" />
        {message}
      </p>
    </div>
  );
}
