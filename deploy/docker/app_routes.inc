# Marshrutlar — HTTP va HTTPS bloklari uchun bir xil, shuning uchun alohida faylda
# (nginx.conf ikkala joyda `include` qiladi; nusxa ko'chirilgan qoidalar vaqt o'tib
# bir-biridan farq qila boshlaydi).

# 12M to'lov cheki skrinshoti uchun yetarli edi, lekin CEFR Listening parti audiosi
# (o'qituvchi panelidan yuklanadi) undan kattaroq bo'ladi — bir part odatda 3-10 MB,
# to'liq CEFR listening audio esa 20-80 MB gacha boradi.
client_max_body_size 150M;

# Xavfsizlik sarlavhalari (Security Headers)
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# To'lov skrinshotlari (shaxsiy cheklar) ommaviy media ichidan to'siladi — ularni faqat
# /api/premium/payments/<id>/screenshot/?token=... orqali autentifikatsiyadan o'tgan holda ko'rish mumkin.
location ^~ /media/payment_screenshots/ {
    return 404;
}

# Yuklangan fayllar — Django emas, nginx beradi (tezroq va ASGI ishchisini band qilmaydi).
location /media/ {
    alias /srv/media/;
    access_log off;
    expires 30d;
}

# Django'ning o'z statik fayllari (admin paneli, DRF). Manzil `/static/` — bu
# Django'ning STATIC_URL sozlamasi bilan bir xil bo'lishi SHART, aks holda admin
# sahifasi CSS'siz ochiladi. Next.js o'z fayllarini `/_next/static/` ostida beradi,
# ya'ni to'qnashuv yo'q.
location /static/ {
    alias /srv/static/;
    access_log off;
    expires 30d;
}

# Battle Arena WebSocket'lari.
location /ws/ {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 3600s;   # jang davomida ulanish uzilmasin
}

# API, Telegram webhook va Django admin.
location ~ ^/(api|telegram|admin)/ {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # 502 / 504 xatolarini to'sish uchun chidamli timeout va qayta urinish
    proxy_connect_timeout 8s;
    proxy_send_timeout 120s;
    proxy_read_timeout 120s;
    proxy_next_upstream error timeout invalid_header http_502 http_503;
    proxy_next_upstream_tries 3;
    proxy_next_upstream_timeout 10s;
}

# Next.js statik fayllari (JS/CSS bundle) — brauzerda 1 yil keshlanadi, sahifa ochilishi bir zumda bo'ladi
location /_next/static/ {
    proxy_pass http://frontend;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header Host $host;
    expires 365d;
    access_log off;
    add_header Cache-Control "public, max-age=31536000, immutable";
}

# Qolgan hamma narsa — Next.js.
location / {
    proxy_pass http://frontend;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_connect_timeout 6s;
    proxy_read_timeout 60s;
    proxy_next_upstream error timeout invalid_header http_502 http_503;
    proxy_next_upstream_tries 2;
}
