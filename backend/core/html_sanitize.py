"""Rich-text HTML tozalash (stored XSS himoyasi).

Savol matni (`Question.body`) CKEditor HTML'i sifatida saqlanadi va frontendda
`dangerouslySetInnerHTML` bilan chiqariladi — o'quvchi ekranida ham, superadmin
panelida ham. O'qituvchi qo'ygan `<script>`, `onerror=` yoki `javascript:` havola
superadmin brauzerida ishga tushib, uning JWT tokenini `localStorage` dan o'g'irlashi
mumkin edi. Shuning uchun HTML saqlashdan OLDIN oq ro'yxat (allowlist) bo'yicha
tozalanadi: formatlash, ro'yxat, jadval va rasm qoladi, skript va hodisa
atributlari olib tashlanadi.
"""
import nh3

_ALLOWED_TAGS = set(nh3.ALLOWED_TAGS)

_ALLOWED_ATTRIBUTES = {k: set(v) for k, v in nh3.ALLOWED_ATTRIBUTES.items()}
_ALLOWED_ATTRIBUTES.setdefault('*', set()).update({'class', 'style'})
for _cell in ('td', 'th'):
    _ALLOWED_ATTRIBUTES.setdefault(_cell, set()).update({'colspan', 'rowspan'})
_ALLOWED_ATTRIBUTES.setdefault('table', set()).update({'border', 'cellpadding', 'cellspacing'})

# CKEditor jadval/rasm o'lchamlari va matn tekislash uchun ishlatadigan xususiyatlar.
_ALLOWED_STYLE_PROPERTIES = {
    'width', 'height', 'min-width', 'max-width', 'text-align', 'vertical-align',
    'color', 'background-color', 'font-weight', 'font-style', 'text-decoration',
    'border', 'border-collapse', 'padding', 'margin', 'float',
}


def sanitize_rich_html(value):
    """HTML'ni xavfsiz qismlargacha qisqartiradi. Bo'sh/None qiymat o'zgarishsiz qaytadi."""
    if not value:
        return value
    return nh3.clean(
        value,
        tags=_ALLOWED_TAGS,
        attributes=_ALLOWED_ATTRIBUTES,
        filter_style_properties=_ALLOWED_STYLE_PROPERTIES,
        url_schemes={'http', 'https', 'mailto'},
    )
