"""O'qituvchiga Django admin'dan foydalanish huquqini berish.

NEGA AVTOMATIK EMAS
-------------------
O'qituvchi bo'lib ro'yxatdan o'tish o'z-o'ziga xizmat (`teacher.api.register_teacher`,
moderatsiyasiz). Agar `is_staff` shu paytda avtomatik berilsa, xohlagan odam "men
o'qituvchiman" deb yozib, Django admin'ga kirib olardi. Shuning uchun huquqni SUPER ADMIN
qo'lda beradi:

    python manage.py teacher_admin_access --grant <username>
    python manage.py teacher_admin_access --revoke <username>

Huquqlar ro'yxati ataylab tor: o'qituvchi to'lovni tasdiqlaydi, mock yaratadi va o'z
sinfini ko'radi — boshqa hech narsa. Ko'rish chegarasi esa alohida qatlamda turadi
(`classroom.admin.TeacherScopedAdmin`), ya'ni huquq bo'lgani bilan begona sinf ko'rinmaydi.
"""
from django.contrib.auth.models import Group, Permission

TEACHER_GROUP_NAME = "O'qituvchi (sinf)"

# (app_label, codename) — guruhga beriladigan huquqlar.
TEACHER_PERMISSIONS = [
    # To'lovni tasdiqlash/rad etish. `change` kerak, chunki admin amallari (actions)
    # shu huquqsiz ro'yxatda umuman ko'rinmaydi; maydonlarning o'zi baribir read-only.
    ('classroom', 'view_payment'),
    ('classroom', 'change_payment'),
    # O'z daromadi — faqat ko'rish. "To'landi" deb belgilashni super admin qiladi.
    ('classroom', 'view_payoutentry'),
    # Mock testni o'zi yaratadi va jadvalga qo'yadi.
    ('classroom', 'view_mocktest'),
    ('classroom', 'add_mocktest'),
    ('classroom', 'change_mocktest'),
    ('classroom', 'delete_mocktest'),
    # O'quvchilarning natijalari va obunalari — faqat ko'rish.
    ('classroom', 'view_mockattempt'),
    ('classroom', 'view_subscription'),
]


def ensure_teacher_group():
    """Guruhni (kerak bo'lsa) yaratadi va huquqlarini ro'yxatga moslaydi.

    Har chaqiruvda huquqlar qayta o'rnatiladi: ro'yxat o'zgarganda guruhda eski, ortiqcha
    huquq qolib ketmasligi kerak.
    """
    group, _ = Group.objects.get_or_create(name=TEACHER_GROUP_NAME)
    permissions = Permission.objects.filter(
        content_type__app_label__in={app for app, _ in TEACHER_PERMISSIONS},
        codename__in={codename for _, codename in TEACHER_PERMISSIONS},
    )
    # `filter` app va codename'ni alohida solishtiradi, shuning uchun juftlik bo'yicha
    # yana bir marta suziladi — boshqa ilovadagi bir xil nomli huquq tushib qolmasin.
    wanted = set(TEACHER_PERMISSIONS)
    matched = [p for p in permissions if (p.content_type.app_label, p.codename) in wanted]
    group.permissions.set(matched)
    return group


def grant_admin_access(user):
    """Foydalanuvchiga o'qituvchi sifatida admin'ga kirish huquqini beradi."""
    group = ensure_teacher_group()
    user.groups.add(group)
    if not user.is_staff:
        user.is_staff = True
        user.save(update_fields=['is_staff'])
    return group


def revoke_admin_access(user):
    """Huquqni olib qo'yadi.

    `is_staff` faqat boshqa hech qanday guruh/huquq qolmagan bo'lsa o'chiriladi —
    foydalanuvchi boshqa sabab bilan ham xodim bo'lishi mumkin.
    """
    group = Group.objects.filter(name=TEACHER_GROUP_NAME).first()
    if group:
        user.groups.remove(group)
    if user.is_staff and not user.is_superuser and not user.groups.exists() and not user.user_permissions.exists():
        user.is_staff = False
        user.save(update_fields=['is_staff'])
