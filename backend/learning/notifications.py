import html
import logging
from django.conf import settings
from django.contrib.auth.models import User
from core.models import Notification
from telegrambot.client import send_message
from .models import CommunityPost, CommunityPostComment

logger = logging.getLogger(__name__)

REACTION_EMOJIS = {
    'fire': '🔥',
    'clap': '👏',
    'trophy': '🏆',
    'heart': '❤️',
}


def _get_feed_markup():
    site_url = getattr(settings, 'NEXT_PUBLIC_SITE_URL', getattr(settings, 'FRONTEND_URL', 'https://ilmildizi.uz')).rstrip('/')
    feed_url = f"{site_url}/feed"
    return {
        'inline_keyboard': [
            [{'text': "📱 Hamjamiyatda ko'rish", 'web_app': {'url': feed_url}}],
            [{'text': "🌐 Brauzerda ochish", 'url': feed_url}],
        ]
    }


def send_post_reaction_notification(post_id: int, actor_id: int, reaction_type: str):
    """Postga reaksiya (like) qoldirilganda muallifga bildirishnoma yuboradi."""
    try:
        post = CommunityPost.objects.select_related('author', 'author__profile', 'test').filter(id=post_id).first()
        if not post or not post.author or post.author.id == actor_id:
            return

        actor = User.objects.filter(id=actor_id).first()
        if not actor:
            return

        actor_name = f"{actor.first_name} {actor.last_name}".strip() or actor.username
        emoji = REACTION_EMOJIS.get(reaction_type, '❤️')

        # 1. Tizim ichidagi bildirishnoma (In-App Notification)
        author_profile = getattr(post.author, 'profile', None)
        if author_profile:
            Notification.objects.create(
                profile=author_profile,
                title=f"Yangi reaksiya {emoji}",
                message=f"{actor_name} sizning postingizga {emoji} qoldirdi.",
                type='system',
            )

        # 2. Telegram orqali bildirishnoma
        if author_profile and author_profile.telegram_id:
            post_snippet = (post.content or (f"Test: {post.test.title}" if post.test else "Hamjamiyat posti")).strip()
            if len(post_snippet) > 60:
                post_snippet = post_snippet[:57] + '...'

            clean_actor = html.escape(actor_name)
            clean_snippet = html.escape(post_snippet)

            text = (
                f"{emoji} <b>Postingizga yangi reaksiya!</b>\n\n"
                f"👤 <b>{clean_actor}</b> postingizga {emoji} qoldirdi.\n"
                f"📝 <i>«{clean_snippet}»</i>\n\n"
                f"Hamjamiyatda ko'rish uchun quyidagi tugmani bosing 👇"
            )
            send_message(int(author_profile.telegram_id), text, reply_markup=_get_feed_markup())
    except Exception as e:
        logger.warning("Failed to send post reaction notification for post %s: %s", post_id, e)


def send_post_comment_notification(post_id: int, comment_id: int, actor_id: int):
    """Postga yangi izoh yoki izohga javob berilganda bildirishnoma yuboradi."""
    try:
        post = CommunityPost.objects.select_related('author', 'author__profile', 'test').filter(id=post_id).first()
        if not post:
            return

        comment = CommunityPostComment.objects.select_related(
            'parent', 'parent__user', 'parent__user__profile'
        ).filter(id=comment_id).first()
        if not comment:
            return

        actor = User.objects.filter(id=actor_id).first()
        if not actor:
            return

        actor_name = f"{actor.first_name} {actor.last_name}".strip() or actor.username
        comment_snippet = comment.text.strip()
        if len(comment_snippet) > 80:
            comment_snippet = comment_snippet[:77] + '...'

        clean_actor = html.escape(actor_name)
        clean_comment = html.escape(comment_snippet)
        markup = _get_feed_markup()

        # Holat 1: Izohga javob berilgan (Reply)
        if comment.parent and comment.parent.user and comment.parent.user.id != actor_id:
            parent_user = comment.parent.user
            parent_profile = getattr(parent_user, 'profile', None)
            if parent_profile:
                Notification.objects.create(
                    profile=parent_profile,
                    title="Izohingizga javob keldi",
                    message=f"{actor_name}: «{comment_snippet}»",
                    type='system',
                )
                if parent_profile.telegram_id:
                    parent_snippet = comment.parent.text.strip()
                    if len(parent_snippet) > 60:
                        parent_snippet = parent_snippet[:57] + '...'
                    clean_parent = html.escape(parent_snippet)

                    text = (
                        f"↩️ <b>Izohingizga javob keldi!</b>\n\n"
                        f"👤 <b>{clean_actor}</b>: <i>«{clean_comment}»</i>\n\n"
                        f"💬 Sizning izohingiz: <i>«{clean_parent}»</i>\n\n"
                        f"Javob qaytarish uchun quyidagi tugmani bosing 👇"
                    )
                    send_message(int(parent_profile.telegram_id), text, reply_markup=markup)

        # Holat 2: Post muallifiga bildirishnoma (agar post muallifi o'zi izoh yozmagan bo'lsa va yuqoridagi reply post muallifiga tegishli bo'lmasa)
        is_parent_author = comment.parent and comment.parent.user and comment.parent.user.id == post.author_id
        if post.author and post.author.id != actor_id and not is_parent_author:
            author_profile = getattr(post.author, 'profile', None)
            if author_profile:
                Notification.objects.create(
                    profile=author_profile,
                    title="Postingizga yangi izoh",
                    message=f"{actor_name}: «{comment_snippet}»",
                    type='system',
                )
                if author_profile.telegram_id:
                    post_snippet = (post.content or (f"Test: {post.test.title}" if post.test else "Hamjamiyat posti")).strip()
                    if len(post_snippet) > 60:
                        post_snippet = post_snippet[:57] + '...'
                    clean_post = html.escape(post_snippet)

                    text = (
                        f"💬 <b>Postingizga yangi izoh yozildi!</b>\n\n"
                        f"👤 <b>{clean_actor}</b>: <i>«{clean_comment}»</i>\n\n"
                        f"📝 <b>Post:</b> <i>«{clean_post}»</i>\n\n"
                        f"Javob qaytarish uchun quyidagi tugmani bosing 👇"
                    )
                    send_message(int(author_profile.telegram_id), text, reply_markup=markup)
    except Exception as e:
        logger.warning("Failed to send post comment notification for post %s, comment %s: %s", post_id, comment_id, e)
