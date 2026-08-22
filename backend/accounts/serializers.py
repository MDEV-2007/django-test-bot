from rest_framework import serializers

from .models import Profile


class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    is_superadmin = serializers.BooleanField(read_only=True)
    is_teacher = serializers.BooleanField(read_only=True)
    freeze_count = serializers.SerializerMethodField()
    # Do'kondan taqib olingan kosmetika (avatar, ramka, unvon, nishon).
    cosmetics = serializers.SerializerMethodField()
    # `avatar_url` — EKRANDA ko'rsatiladigan rasm: avatar kosmetikasi taqilgan bo'lsa
    # o'sha, aks holda hisobning o'z rasmi. Shu tufayli sidebar, reyting, profil —
    # hammasi bitta maydonga qarab to'g'ri ishlaydi.
    avatar_url = serializers.SerializerMethodField()
    base_avatar_url = serializers.CharField(source='avatar_url', read_only=True)

    class Meta:
        model = Profile
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email', 'role',
            'is_superadmin', 'is_teacher', 'avatar_url', 'xp', 'level', 'coins',
            'streak', 'is_premium', 'has_seen_onboarding', 'elo_rating', 'next_level_xp',
            'freeze_count', 'cosmetics', 'base_avatar_url',
        ]

    def get_freeze_count(self, obj):
        from shop.services import available_freezes
        return available_freezes(obj)

    def get_cosmetics(self, obj):
        from shop.services import get_equipped
        return get_equipped(obj)

    def get_avatar_url(self, obj):
        from shop.services import display_avatar_url, get_equipped
        return display_avatar_url(obj.avatar_url, get_equipped(obj))
