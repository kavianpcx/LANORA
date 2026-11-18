import { useRef, useState } from "react";
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
  showPreferences = true,
  showDisplayName = true,
  showAvatarPicker = true,
  autoFocusAvatar = false,
}: {
  lang: "en" | "fa";
  theme: "light" | "dark";
  name: string;
  avatar: AvatarKind;
  setLang: (v: "en" | "fa") => void;
  setTheme: (v: "light" | "dark") => void;
  setAvatar: (v: AvatarKind) => void;
  showPreferences?: boolean;
  showDisplayName?: boolean;
  showAvatarPicker?: boolean;
  autoFocusAvatar?: boolean;
}) {
  const t = labels[lang];
  const pickerRef = useRef<HTMLDivElement>(null);
  const [showAll, setShowAll] = useState(false);
  const shownAvatars = showAll
    ? avatars
    : avatars.filter((item, index) => index < 6 || item === avatar);
  const focusAvatar = (index: number) => {
    const next = shownAvatars[index];
    if (!next) return;
    setAvatar(next);
    pickerRef.current
      ?.querySelector<HTMLButtonElement>(`#avatar-${next}`)
      ?.focus();
  };
  return (
    <>
      {showAvatarPicker && <div
        ref={pickerRef}
        id="profile-avatar-picker"
        className="avatar-picker"
        role="group"
        aria-label={lang === "fa" ? "انتخاب آواتار" : "Choose an avatar"}
        dir="ltr"
      >
        {shownAvatars.map((a) => (
          <button
            key={a}
            id={`avatar-${a}`}
            type="button"
            aria-label={avatarNames[lang][a]}
            aria-pressed={avatar === a}
            tabIndex={avatar === a ? 0 : -1}
            autoFocus={autoFocusAvatar && avatar === a}
            onClick={() => setAvatar(a)}
            onKeyDown={(event) => {
              const index = shownAvatars.indexOf(a);
              const columns = pickerRef.current
                ? getComputedStyle(pickerRef.current)
                    .gridTemplateColumns.trim().split(/\s+/).length
                : 5;
              const nextIndex =
                event.key === "ArrowRight"
                  ? Math.min(index + 1, shownAvatars.length - 1)
                  : event.key === "ArrowLeft"
                    ? Math.max(index - 1, 0)
                    : event.key === "ArrowDown"
                      ? Math.min(index + columns, shownAvatars.length - 1)
                      : event.key === "ArrowUp"
                        ? Math.max(index - columns, 0)
                        : event.key === "Home"
                          ? 0
                          : event.key === "End"
                          ? shownAvatars.length - 1
                            : index;
              if (nextIndex !== index) {
                event.preventDefault();
                focusAvatar(nextIndex);
              }
            }}
          >
            <Avatar kind={a} size={40} decorative />
          </button>
        ))}
      </div>}
      {showAvatarPicker && avatars.length > 6 && (
        <button
          className="avatar-picker-expand"
          type="button"
          aria-expanded={showAll}
          aria-controls="profile-avatar-picker"
          onClick={() => setShowAll((value) => !value)}
        >
          {showAll ? t.showFewerAvatars : t.showAllAvatars}
        </button>
      )}
      {showDisplayName && <label dir={lang === "fa" ? "rtl" : "ltr"}>
        {t.profile}
        <input
          name="name"
          defaultValue={name}
          dir="auto"
          autoComplete="nickname"
          minLength={2}
          maxLength={32}
          required
          placeholder={t.displayName}
          autoFocus={!showAvatarPicker}
        />
      </label>}
      {showPreferences && (
        <div className="app-profile-preferences">
          <div className="app-pref">
            <span dir={lang === "fa" ? "rtl" : "ltr"}>{t.language}</span>
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
            <span dir={lang === "fa" ? "rtl" : "ltr"}>{t.theme}</span>
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
        </div>
      )}
    </>
  );
}
