"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cachedFetch } from "@/hooks/appCache";

export type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  bgColor: string | null;
  linkUrl: string;
};

export default function BannerCarousel() {
  const [banners, setBanners] = useState<Banner[] | null>(null);
  const [index, setIndex] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cachedFetch<{ banners: Banner[] }>("/api/banners", 5 * 60_000)
      .then((d) => setBanners(d.banners ?? []))
      .catch(() => setBanners([]));
  }, []);

  useEffect(() => {
    if (!banners || banners.length <= 1) return;
    const el = scrollerRef.current;
    if (!el) return;
    const id = setInterval(() => {
      const next = (index + 1) % banners.length;
      el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    }, 4000);
    return () => clearInterval(id);
  }, [banners, index]);

  if (banners === null) {
    return <div style={{ height: 56 }} className="rounded-[4px] bg-gray-200 animate-pulse" />;
  }

  if (banners.length === 0) return <div style={{ height: 56 }} className="rounded-[4px]" />;

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) setIndex(i);
  };

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide rounded-[4px]"
      >
        {banners.map((b) => (
          <Link
            key={b.id}
            href={b.linkUrl}
            className="relative shrink-0 w-full snap-center overflow-hidden"
            style={{ height: 56 }}
          >
            {b.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={b.imageUrl}
                alt={b.title}
                width={800}
                height={56}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
          </Link>
        ))}
      </div>

      {banners.length > 1 && (
        <div className="absolute bottom-1.5 right-2 flex gap-1">
          {banners.map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all ${
                i === index ? "w-3 bg-white" : "w-1 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
