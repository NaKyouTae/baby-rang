import type { MetadataRoute } from "next";

const BASE_URL = "https://baby-rang.spectrify.kr";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/auth/",
          "/settings/",
          "/payment/",
          "/temperament/test/",
          "/temperament/result/",
          "/api/",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
