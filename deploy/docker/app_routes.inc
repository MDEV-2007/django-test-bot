# Marshrutlar — HTTP va HTTPS bloklari uchun bir xil, shuning uchun alohida faylda
# (nginx.conf ikkala joyda `include` qiladi; nusxa ko'chirilgan qoidalar vaqt o'tib
# bir-biridan farq qila boshlaydi).

# 12M to'lov cheki skrinshoti uchun yetarli edi, lekin CEFR Listening parti audiosi
# (o'qituvchi panelidan yuklanadi) undan kattaroq bo'ladi — bir part odatda 3-10 MB,
# uzunrog'i esa bundan ham oshadi.
client_max_body_size 64M;

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
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 120s;    # AI javoblari sekinroq bo'lishi mumkin
}

# Qolgan hamma narsa — Next.js.
location / {
    proxy_pass http://frontend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
