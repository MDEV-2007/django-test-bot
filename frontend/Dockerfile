# Next.js frontend — uch bosqichli qurilish.
#
# Nega uch bosqich: yakuniy obrazda na manba kod, na `node_modules` ning to'liq nusxasi
# qoladi. `output: 'standalone'` (next.config.ts) faqat haqiqatan chaqiriladigan
# paketlarni yig'ib beradi, shuning uchun runtime obraz bir necha barobar kichik va
# ishga tushishi tez.

# ── 1. Bog'liqliklar ──────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
# Faqat manifestlar: kod o'zgarganda ham bu qatlam keshdan olinadi.
COPY package.json package-lock.json ./
RUN npm ci

# ── 2. Qurilish ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# API manzili bo'sh: so'rovlar sahifaning o'z origin'iga ketadi va ularni nginx
# backendga uzatadi. Bu qiymat build vaqtida kodga yoziladi, shuning uchun uni shu
# yerda ochiq belgilab qo'yamiz — aks holda mezbondagi tasodifiy .env.local tushib
# qolishi mumkin.
ENV NEXT_PUBLIC_API_URL=""
RUN npm run build

# ── 3. Ishga tushirish ────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Root'dan ishlamaslik: konteyner buzilgan taqdirda ham imkoniyatlari cheklangan bo'ladi.
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# `server.js` — standalone rejimi yaratadigan kirish nuqtasi (next start emas).
CMD ["node", "server.js"]
