import axolotl from "../assets/avatars/axolotl.webp";
import bear from "../assets/avatars/bear.webp";
import cat from "../assets/avatars/cat.webp";
import dog from "../assets/avatars/dog.webp";
import dragon from "../assets/avatars/dragon.webp";
import duck from "../assets/avatars/duck.webp";
import fox from "../assets/avatars/fox.webp";
import frog from "../assets/avatars/frog.webp";
import ghost from "../assets/avatars/ghost.webp";
import koala from "../assets/avatars/koala.webp";
import owl from "../assets/avatars/owl.webp";
import panda from "../assets/avatars/panda.webp";
import penguin from "../assets/avatars/penguin.webp";
import rabbit from "../assets/avatars/rabbit.webp";
import raccoon from "../assets/avatars/raccoon.webp";
import robot from "../assets/avatars/robot.webp";
import tiger from "../assets/avatars/tiger.webp";
import { avatarNames, type AvatarKind } from "./avatarData";
export { avatarNames, avatars } from "./avatarData";
export type { AvatarKind } from "./avatarData";

const images: Record<AvatarKind, string> = {
  fox,
  cat,
  bear,
  dog,
  owl,
  panda,
  rabbit,
  frog,
  tiger,
  penguin,
  koala,
  duck,
  axolotl,
  raccoon,
  dragon,
  robot,
  ghost,
};

const backgrounds: Record<AvatarKind, string> = {
  fox: "#f5c79f",
  cat: "#d9d2f0",
  bear: "#d9c6ae",
  dog: "#f3d99f",
  owl: "#ead1ab",
  panda: "#dce2eb",
  rabbit: "#f4d2df",
  frog: "#d0e8a0",
  tiger: "#f5c17f",
  penguin: "#c8d9ef",
  koala: "#d0d6e0",
  duck: "#f4df9c",
  axolotl: "#f5c8df",
  raccoon: "#c4cce1",
  dragon: "#d8c3f2",
  robot: "#c6e3ef",
  ghost: "#e2e4f4",
};

export function Avatar({
  kind = "fox",
  size = 40,
  decorative = false,
}: {
  kind?: AvatarKind;
  size?: number;
  decorative?: boolean;
}) {
  return (
    <span
      className={`avatar-shell avatar-${kind}`}
      style={{
        width: size,
        height: size,
        backgroundColor: backgrounds[kind],
      }}
    >
      <img
        src={images[kind]}
        alt={decorative ? "" : `${avatarNames.en[kind]} avatar`}
        draggable={false}
      />
    </span>
  );
}
