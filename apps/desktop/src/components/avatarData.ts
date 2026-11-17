export const avatars = [
  "fox", "cat", "bear", "dog", "owl", "panda", "rabbit", "frog", "tiger", "penguin",
  "koala", "duck", "axolotl", "raccoon", "dragon", "robot", "ghost",
] as const;

export type AvatarKind = (typeof avatars)[number];

export const avatarNames: Record<"en" | "fa", Record<AvatarKind, string>> = {
  en: {
    fox: "Fox", cat: "Cat", bear: "Bear", dog: "Shiba Inu", owl: "Owl", panda: "Panda",
    rabbit: "Bunny", frog: "Frog", tiger: "Tiger", penguin: "Penguin", koala: "Koala",
    duck: "Duck", axolotl: "Axolotl", raccoon: "Raccoon", dragon: "Dragon", robot: "Robot", ghost: "Ghost",
  },
  fa: {
    fox: "روباه", cat: "گربه", bear: "خرس", dog: "شیبا", owl: "جغد", panda: "پاندا",
    rabbit: "خرگوش", frog: "قورباغه", tiger: "ببر", penguin: "پنگوئن", koala: "کوالا",
    duck: "اردک", axolotl: "اکسولوتل", raccoon: "راکون", dragon: "اژدها", robot: "ربات", ghost: "روح",
  },
};
