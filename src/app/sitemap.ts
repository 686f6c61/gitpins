import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

const PUBLIC_ROUTES = [
  { path: "", priority: 1, changeFrequency: "weekly" as const },
  { path: "/help", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/how-it-works", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/legal", priority: 0.5, changeFrequency: "yearly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PUBLIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path || "/"}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
