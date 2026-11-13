import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://ilmildizi.uz";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/dtm-test",
          "/milliy-sertifikat",
          "/mentor",
          "/library",
          "/flashcards",
          "/battles",
          "/leaderboard",
          "/feed",
          "/llms.txt",
        ],
        disallow: [
          "/panel/",
          "/ads-manager/",
          "/api/",
          "/onboarding/",
          "/pay/",
        ],
      },
      {
        userAgent: [
          "GPTBot",
          "OAI-SearchBot",
          "ChatGPT-User",
          "PerplexityBot",
          "Perplexity-User",
          "ClaudeBot",
          "Claude-Web",
          "anthropic-ai",
          "Google-Extended",
          "Googlebot",
          "Bingbot",
          "Applebot-Extended",
        ],
        allow: [
          "/",
          "/dtm-test",
          "/milliy-sertifikat",
          "/mentor",
          "/library",
          "/flashcards",
          "/battles",
          "/leaderboard",
          "/feed",
          "/llms.txt",
        ],
        disallow: ["/panel/", "/ads-manager/", "/api/", "/pay/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
