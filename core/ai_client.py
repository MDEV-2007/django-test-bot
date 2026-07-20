"""Thin client for AI chat-completions with a two-provider chain.

Used by the AI Mentor chat (learning app), the post-test AI feedback and the
revision-mistake explanations (tests_app). Provider chain:

    1. Groq Cloud (OpenAI-compatible) — settings.GROQ_API_KEY bo'lsa;
    2. Lokal Ollama zaxira — settings.OLLAMA_API_URL bo'lsa (Groq ishlamay
       qolganda, masalan kunlik token limiti tugaganda, AI funksiyalari
       o'chib qolmasligi uchun).

Callers must treat a None return as "AI unavailable" and fall back to their
own rule-based logic — this keeps every AI feature working even with no
provider configured at all.
"""
import logging
import re

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

# --- Circuit breaker -----------------------------------------------------------
# When the provider is unreachable at the network level (DNS, proxy, firewall) every
# call pays the full timeout before failing. That turned a blocked host into
# ~20s of dead wait per request — and with the Ollama fallback behind it, up to 80s —
# on pages that grade answers or run the mentor chat.
#
# So the first connection-level failure "opens the circuit": for the next
# BREAKER_COOLDOWN seconds we skip the call entirely and return None immediately, which
# drops callers straight onto their rule-based fallback. HTTP errors (401, 429, 500) do
# NOT open it — those mean the host is reachable and the request itself was the problem.
BREAKER_COOLDOWN = 300  # 5 minutes
_BREAKER_KEY = 'ai_client:down:{provider}'


def _is_down(provider):
    from django.core.cache import cache
    return cache.get(_BREAKER_KEY.format(provider=provider)) is not None


def _mark_down(provider, exc):
    from django.core.cache import cache
    cache.set(_BREAKER_KEY.format(provider=provider), '1', BREAKER_COOLDOWN)
    logger.warning("%s unreachable (%s) — skipping it for %ss",
                   provider, type(exc).__name__, BREAKER_COOLDOWN)


# Network-level failures: the host could not be reached at all.
_UNREACHABLE = (
    requests.exceptions.ConnectionError,   # covers ProxyError and DNS failures
    requests.exceptions.Timeout,
)

# (connect, read): a blocked proxy or dead host is rejected in seconds instead of
# burning the whole read-timeout window meant for slow-but-working responses.
CONNECT_TIMEOUT = 5


def _ask_groq(messages, temperature, response_format, timeout):
    api_key = settings.GROQ_API_KEY
    if not api_key or _is_down('groq'):
        return None

    payload = {
        "model": settings.GROQ_MODEL,
        "messages": messages,
        "temperature": temperature,
    }
    if response_format:
        payload["response_format"] = response_format

    try:
        resp = requests.post(
            GROQ_API_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            json=payload,
            timeout=(CONNECT_TIMEOUT, timeout),
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]
    except _UNREACHABLE as exc:
        _mark_down('groq', exc)
        return None
    except Exception:
        logger.exception("Groq API call failed")
        return None


def _ask_ollama(messages, temperature, response_format, timeout):
    base_url = (settings.OLLAMA_API_URL or "").rstrip("/")
    if not base_url or _is_down('ollama'):
        return None

    payload = {
        "model": settings.OLLAMA_AI_MODEL,
        "messages": messages,
        "stream": False,
        # think=False — qwen3'ning ichki mulohaza rejimini o'chiradi (3x tezroq)
        "think": False,
        "options": {"temperature": temperature},
    }
    if response_format and response_format.get("type") == "json_object":
        payload["format"] = "json"

    try:
        resp = requests.post(f"{base_url}/api/chat", json=payload,
                             timeout=(CONNECT_TIMEOUT, max(timeout, 60)))
        resp.raise_for_status()
        content = resp.json()["message"]["content"]
        # Ba'zi modellar think=False'ni bilmaydi — <think> bloklarini tozalaymiz
        return re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL).strip()
    except _UNREACHABLE as exc:
        _mark_down('ollama', exc)
        return None
    except Exception:
        logger.exception("Ollama API call failed")
        return None


def ask_groq(messages, temperature=0.6, response_format=None, timeout=20):
    """Public entry point (nomi tarixiy — endi provider zanjiri).

    Avval Groq, u ishlamasa lokal Ollama. Ikkalasi ham bo'lmasa None —
    chaqiruvchi o'zining qoida-asosli fallback'iga o'tadi.
    """
    content = _ask_groq(messages, temperature, response_format, timeout)
    if content is None:
        content = _ask_ollama(messages, temperature, response_format, timeout)
    return content
