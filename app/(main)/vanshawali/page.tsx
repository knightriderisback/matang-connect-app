"use client";
import { useState, useEffect } from "react";

export default function VanshawaliPage() {
  return (
    <div className="min-h-screen flex flex-col items-center pt-10 px-4 bg-gray-50">
      <img
        src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALQAAABACAYAAACzzl09AABD/klEQVR42u19eXxdVdX2s/be59w589B0TEtpS1IKtAUBgaTMMogi" 
        alt="वंशावली"
        style={{
          width: "min(56vw, 220px)",
          maxHeight: 48,
          height: "auto",
          objectFit: "contain",
          pointerEvents: "none",
          display: "block",
          margin: "0 auto",
        }}
        draggable={false}
      />
      <p className="mt-6 text-center text-sm text-gray-600 max-w-md">
        Full family tree is being restored. The exact gold image you provided is now the heading (transparent, no background).
      </p>
    </div>
  );
}
