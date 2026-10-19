"use client";

/** Exact user-provided gold "वंशावली" image as heading only. */
export function VanshNameplate() {
  return (
    <img
      src="/vanshawali-title-user.jpg"
      alt="वंशावली"
      className="vh-sign select-none"
      draggable={false}
      style={{
        width: "min(72vw, 320px)",
        maxHeight: 96,
        height: "auto",
        objectFit: "contain",
        pointerEvents: "none",
        display: "block",
        margin: "0 auto",
      }}
    />
  );
}
