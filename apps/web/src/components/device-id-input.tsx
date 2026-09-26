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

/** Hidden field carrying this browser's device ID, kept in localStorage alongside the server's cookie. */
export function DeviceIdInput() {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.value = readDeviceId();
  }, []);
  return <input ref={ref} type="hidden" name="deviceId" defaultValue="" />;
}
