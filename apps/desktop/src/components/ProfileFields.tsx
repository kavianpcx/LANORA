import { Globe2, Sun, Moon } from "lucide-react";
import { Avatar, avatars, type AvatarKind } from "./Avatar";
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
  return (
    <>
      <div className="avatar-picker">
        {avatars.map((a) => (
          <button
            key={a}
            type="button"
            aria-label={a}
            aria-pressed={avatar === a}
            onClick={() => setAvatar(a)}
          >
            <Avatar kind={a} />
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
