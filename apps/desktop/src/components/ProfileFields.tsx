import { Globe2, Sun, Moon } from "lucide-react";
import {
  Avatar,
  avatarNames,
  avatars,
  type AvatarKind,
} from "./Avatar";
import { labels } from "../labels";
export function ProfileFields({
  lang,
  theme,
  name,
  avatar,
  setLang,
  setTheme,
  setAvatar,
}: {
  lang: "en" | "fa";
  theme: "light" | "dark";
  name: string;
  avatar: AvatarKind;
  setLang: (v: "en" | "fa") => void;
  setTheme: (v: "light" | "dark") => void;
  setAvatar: (v: AvatarKind) => void;
}) {
  const t = labels[lang];
  const focusAvatar = (index: number) => {
    const next = avatars[index];
    if (!next) return;
    setAvatar(next);
    document.getElementById(`avatar-${next}`)?.focus();
  };
  return (
    <>
      <div className="avatar-selected-preview" aria-live="polite">
        <Avatar kind={avatar} size={58} decorative />
        <div>
          <small>{lang === "fa" ? "آواتار انتخاب‌شده" : "Selected avatar"}</small>
          <strong dir="auto">{avatarNames[lang][avatar]}</strong>
        </div>
      </div>
      <div
        className="avatar-picker"
        role="group"
        aria-label={lang === "fa" ? "انتخاب آواتار" : "Choose an avatar"}
      >
        {avatars.map((a) => (
          <button
            key={a}
            id={`avatar-${a}`}
            type="button"
            aria-label={avatarNames[lang][a]}
            aria-pressed={avatar === a}
            tabIndex={avatar === a ? 0 : -1}
            onClick={() => setAvatar(a)}
            onKeyDown={(event) => {
              const index = avatars.indexOf(a);
              const rowLength = 5;
              const nextIndex =
                event.key === "ArrowRight"
                  ? Math.min(index + 1, avatars.length - 1)
                  : event.key === "ArrowLeft"
                    ? Math.max(index - 1, 0)
                    : event.key === "ArrowDown"
                      ? Math.min(index + rowLength, avatars.length - 1)
                      : event.key === "ArrowUp"
                        ? Math.max(index - rowLength, 0)
                        : event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? avatars.length - 1
                            : index;
              if (nextIndex !== index) {
                event.preventDefault();
                focusAvatar(nextIndex);
              }
            }}
          >
            <Avatar kind={a} size={48} decorative />
          </button>
        ))}
      </div>
      <label>
        {t.profile}
        <input
          name="name"
          defaultValue={name}
          minLength={2}
          maxLength={32}
          required
          placeholder={t.displayName}
        />
      </label>
      <div className="app-pref">
        <span>{t.language}</span>
        <div>
          <button
            type="button"
            className={lang === "en" ? "selected" : ""}
            onClick={() => setLang("en")}
          >
            <Globe2 size={15} />
            English
          </button>
          <button
            type="button"
            className={lang === "fa" ? "selected" : ""}
            onClick={() => setLang("fa")}
          >
            فارسی
          </button>
        </div>
      </div>
      <div className="app-pref">
        <span>{t.theme}</span>
        <div>
          <button
            type="button"
            className={theme === "light" ? "selected" : ""}
            onClick={() => setTheme("light")}
          >
            <Sun size={15} />
            {t.light}
          </button>
          <button
            type="button"
            className={theme === "dark" ? "selected" : ""}
            onClick={() => setTheme("dark")}
          >
            <Moon size={15} />
            {t.dark}
          </button>
        </div>
      </div>
    </>
  );
}
