"use client";

import { useEffect, useRef } from "react";

const STORAGE_KEY = "lucenta-device-id";

function readDeviceId() {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

function webglInfo() {
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    if (!gl) return "";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const vendor = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
    const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    return `${vendor}|${renderer}|${gl.getParameter(gl.MAX_TEXTURE_SIZE)}`;
  } catch {
    return "";
  }
}

function canvasInfo() {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 240;
    canvas.height = 60;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.textBaseline = "top";
    ctx.font = "16px Arial";
    ctx.fillStyle = "#f60";
    ctx.fillRect(100, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("Lucenta, device check 😃", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("Lucenta, device check 😃", 4, 17);
    return canvas.toDataURL();
  } catch {
    return "";
  }
}

/** A hash of stable device characteristics. It survives private windows and cleared storage, but isn't unique. */
async function fingerprint() {
  try {
    const parts = [
      `${screen.width}x${screen.height}x${screen.colorDepth}`,
      window.devicePixelRatio,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.language,
      navigator.hardwareConcurrency,
      navigator.maxTouchPoints,
      navigator.platform,
      webglInfo(),
      canvasInfo(),
    ];
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(parts.join("||")));
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return "";
  }
}

/** Hidden fields carrying this browser's device ID (kept in localStorage alongside the server's cookie) and fingerprint. */
export function DeviceIdInput() {
  const idRef = useRef<HTMLInputElement>(null);
  const fpRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (idRef.current) idRef.current.value = readDeviceId();
    fingerprint().then((fp) => {
      if (fpRef.current) fpRef.current.value = fp;
    });
  }, []);
  return (
    <>
      <input ref={idRef} type="hidden" name="deviceId" defaultValue="" />
      <input ref={fpRef} type="hidden" name="fp" defaultValue="" />
    </>
  );
}
