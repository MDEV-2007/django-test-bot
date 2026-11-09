import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://ilmildizi.uz";
  const now = new Date();

  const routes = [
    { path: "", priority: 1.0, changeFrequency: "daily" as const },
    { path: "/milliy-sertifikat", priority: 0.95, changeFrequency: "daily" as const },
    { path: "/dtm-test", priority: 0.95, changeFrequency: "daily" as const },
    { path: "/mentor", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/library", priority: 0.85, changeFrequency: "weekly" as const },
    { path: "/flashcards", priority: 0.85, changeFrequency: "weekly" as const },
    { path: "/battles", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/leaderboard", priority: 0.8, changeFrequency: "daily" as const },
    { path: "/feed", priority: 0.75, changeFrequency: "daily" as const },
    { path: "/games/map", priority: 0.7, changeFrequency: "weekly" as const },
    { path: "/games/timeline", priority: 0.7, changeFrequency: "weekly" as const },
    { path: "/games/character", priority: 0.7, changeFrequency: "weekly" as const },
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
