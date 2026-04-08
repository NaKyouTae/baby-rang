"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Banner } from "./BannerCarousel";

export default function StripBanner() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    fetch("/api/banners", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setBanners(d.banners ?? []))
      .catch(() => setBanners([]));
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % banners.length);
    }, 4000);
    return () => clearInterval(id);
  }, [banners.length]);

  if (banners.length === 0) return null;

  const b = banners[index];

  return (
    <Link
      href={b.linkUrl}
      className="relative block h-12 rounded-[4px] overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.1)]"
      style={{
        background: b.bgColor
          ? `linear-gradient(135deg, ${b.bgColor}, #FF7E5F)`
          : "linear-gradient(135deg,#FFB347,#FF7E5F)",
      }}
    >
      {b.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={b.imageUrl}
          alt={b.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div className="relative h-full flex items-center justify-between px-4 text-white">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold truncate">{b.title}</div>
          {b.subtitle && (
            <div className="text-[10px] opacity-90 truncate">{b.subtitle}</div>
          )}
        </div>
        {banners.length > 1 && (
          <div className="ml-2 text-[10px] bg-black/30 px-1.5 py-0.5 rounded-full shrink-0">
            {index + 1}/{banners.length}
          </div>
        )}
      </div>
    </Link>
  );
}
