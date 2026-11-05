"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "./api";

type Branding = {
  app_name: string;
  primary_color: string;
  accent_color: string;
  logo_url: string | null;
  favicon_url: string | null;
  current_theme: string;
  background_image_url: string | null;
  background_blur: string | number | null;
  panel_url: string | null;
};

const Ctx = createContext<{ branding: Branding | null }>({ branding: null });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<Branding | null>(null);

  useEffect(() => {
    let bg = document.getElementById("dash0-bg-layer") as HTMLDivElement | null;
    if (!bg) {
      bg = document.createElement("div");
      bg.id = "dash0-bg-layer";
      bg.style.position = "fixed";
      bg.style.inset = "0";
      bg.style.zIndex = "-1";
      bg.style.opacity = "0";
      bg.style.backgroundSize = "cover";
      bg.style.backgroundPosition = "center";
      bg.style.backgroundRepeat = "no-repeat";
      bg.style.transition = "background-image 0.4s ease, filter 0.4s ease, opacity 0.4s ease";
      bg.style.pointerEvents = "none";
      document.body.prepend(bg);
    }

    let cancelled = false;
    async function load() {
      try {
        const b = await api("/branding");
        if (cancelled) return;
        setBranding(b);
        const root = document.documentElement;
        const primary = b.primary_color || "#e11d48";
        const accent = b.accent_color || "#ff3b6b";
        root.style.setProperty("--accent", primary);
        root.style.setProperty("--accent-2", accent);
        if (b.app_name) document.title = b.app_name;

        if (b.background_image_url) {
          bg!.style.backgroundImage = `url(${b.background_image_url})`;
          const blur = Number(b.background_blur || 0);
          bg!.style.filter = blur ? `blur(${blur}px)` : "none";
          bg!.style.opacity = "0.32";
          document.body.style.background = "transparent";
        } else {
          bg!.style.backgroundImage = "none";
          bg!.style.filter = "none";
          bg!.style.opacity = "0";
          document.body.style.background = "";
        }

        const iconUrl = (b.favicon_url || b.logo_url || "").trim();
        if (iconUrl && iconUrl !== "None") {
          let icon = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
          if (!icon) { icon = document.createElement("link"); icon.rel = "icon"; document.head.appendChild(icon); }
          icon.href = iconUrl;
          let apple = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement | null;
          if (!apple) { apple = document.createElement("link"); apple.rel = "apple-touch-icon"; document.head.appendChild(apple); }
          apple.href = iconUrl;
        }
        // logo image global broken handler
      } catch {}
    }
    load();
    const t = setInterval(load, 5000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  return <Ctx.Provider value={{ branding }}>{children}</Ctx.Provider>;
}

export function useBranding() { return useContext(Ctx); }
