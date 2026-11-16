export const avatars = ["fox", "cat", "bear", "dog"] as const;
export type AvatarKind = (typeof avatars)[number];
export function Avatar({ kind = "fox" }: { kind?: AvatarKind }) {
  const color = {
    fox: "#e9a66c",
    cat: "#b6a5df",
    bear: "#a7bd94",
    dog: "#86b5ce",
  }[kind];
  return (
    <svg
      viewBox="0 0 64 64"
      width="40"
      height="40"
      role="img"
      aria-label={kind}
    >
      <rect width="64" height="64" rx="20" fill={color} />
      {kind === "cat" || kind === "fox" ? (
        <path d="M14 30V10l16 13M50 30V10L34 23" fill="#f6efe6" />
      ) : (
        <>
          <circle cx="16" cy="23" r="9" fill="#f6efe6" />
          <circle cx="48" cy="23" r="9" fill="#f6efe6" />
        </>
      )}
      <ellipse cx="32" cy="36" rx="21" ry="18" fill="#f6efe6" />
      <circle cx="24" cy="33" r="2.5" fill="#29354a" />
      <circle cx="40" cy="33" r="2.5" fill="#29354a" />
      <path d="m28 41 4 4 4-4Z" fill="#29354a" />
      <path
        d="M24 47q8 6 16 0"
        fill="none"
        stroke="#29354a"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
