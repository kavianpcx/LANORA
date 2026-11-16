export const avatars = [
  "fox",
  "cat",
  "bear",
  "dog",
  "owl",
  "panda",
  "rabbit",
  "frog",
  "tiger",
  "penguin",
] as const;

export type AvatarKind = (typeof avatars)[number];

const colors: Record<AvatarKind, string> = {
  fox: "#e9a66c",
  cat: "#b6a5df",
  bear: "#a7bd94",
  dog: "#86b5ce",
  owl: "#d6a879",
  panda: "#aeb9c8",
  rabbit: "#e5a8bd",
  frog: "#8bc7a0",
  tiger: "#ed9d62",
  penguin: "#91b8d4",
};

export function Avatar({ kind = "fox" }: { kind?: AvatarKind }) {
  const pointed = ["cat", "fox", "tiger"].includes(kind);
  const rounded = ["bear", "dog", "panda", "owl", "frog", "penguin"].includes(kind);
  return (
    <svg
      viewBox="0 0 64 64"
      width="40"
      height="40"
      role="img"
      aria-label={kind}
    >
      <rect width="64" height="64" rx="20" fill={colors[kind]} />
      {kind === "rabbit" ? (
        <path d="M20 27c-6-17-2-23 3-23 8 0 10 13 10 23m1 0c0-13 5-23 11-22 7 2 4 15-1 25" fill="#f6efe6" />
      ) : pointed ? (
        <path d="M14 30V9l17 15L49 9v22L34 24Z" fill="#f6efe6" />
      ) : rounded ? (
        <>
          <circle cx="16" cy="23" r="9" fill={kind === "panda" ? "#29354a" : "#f6efe6"} />
          <circle cx="48" cy="23" r="9" fill={kind === "panda" ? "#29354a" : "#f6efe6"} />
        </>
      ) : null}
      {kind === "penguin" ? <ellipse cx="32" cy="37" rx="19" ry="23" fill="#29354a" /> : null}
      <ellipse
        cx="32"
        cy="37"
        rx={kind === "penguin" ? 14 : 21}
        ry={kind === "penguin" ? 17 : 19}
        fill="#f6efe6"
      />
      {kind === "panda" ? (
        <>
          <ellipse cx="24" cy="34" rx="6" ry="8" fill="#29354a" />
          <ellipse cx="40" cy="34" rx="6" ry="8" fill="#29354a" />
        </>
      ) : kind === "owl" ? (
        <>
          <circle cx="24" cy="33" r="7" fill="#fff" />
          <circle cx="40" cy="33" r="7" fill="#fff" />
          <circle cx="24" cy="33" r="2.5" fill="#29354a" />
          <circle cx="40" cy="33" r="2.5" fill="#29354a" />
        </>
      ) : kind === "frog" ? (
        <>
          <circle cx="22" cy="24" r="8" fill="#f6efe6" />
          <circle cx="42" cy="24" r="8" fill="#f6efe6" />
          <circle cx="22" cy="24" r="2.5" fill="#29354a" />
          <circle cx="42" cy="24" r="2.5" fill="#29354a" />
        </>
      ) : null}
      {kind !== "owl" && kind !== "frog" && (
        <>
          <circle cx="24" cy="34" r="2.5" fill="#29354a" />
          <circle cx="40" cy="34" r="2.5" fill="#29354a" />
        </>
      )}
      <path
        d={kind === "penguin" ? "m29 40 3 3 3-3Z" : "m28 42 4 4 4-4Z"}
        fill={kind === "penguin" ? "#e9a66c" : "#29354a"}
      />
      <path
        d="M24 49q8 5 16 0"
        fill="none"
        stroke="#29354a"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {kind === "tiger" && (
        <path
          d="m19 19 6 4m20-4-6 4m-12 5 5 2m9-2-5 2"
          stroke="#29354a"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
