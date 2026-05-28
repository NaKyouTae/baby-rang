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
      .then((d) => setBanners((d.banners ?? []).filter((b) => !!b.imageUrl)))
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
    return <div style={{ height: 80 }} className="rounded-[8px] bg-gray-200 animate-pulse" />;
  }

  if (banners.length === 0) return null;

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
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide rounded-[8px]"
      >
        {banners.map((b) => (
          <Link
            key={b.id}
            href={b.linkUrl}
            className="relative shrink-0 w-full snap-center overflow-hidden"
            style={{ height: 80 }}
          >
            {b.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={b.imageUrl}
                alt={b.title}
                width={800}
                height={80}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
          </Link>
        ))}
      </div>

      {banners.length > 1 && (
        <div
          className="absolute bottom-1.5 right-2 flex items-center justify-center px-1.5"
          style={{
            height: 14,
            borderRadius: 50,
            backgroundColor: "#FDFDFE",
            fontSize: 10,
            lineHeight: "14px",
          }}
        >
          <span style={{ color: "#000" }}>{index + 1}</span>
          <span style={{ color: "#6b7280" }}>&nbsp;/&nbsp;{banners.length}</span>
        </div>
      )}
    </div>
  );
}
