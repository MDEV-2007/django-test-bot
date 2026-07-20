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


def _ask_groq(messages, temperature, response_format, timeout):
    api_key = settings.GROQ_API_KEY
    if not api_key:
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
            timeout=timeout,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]
    except Exception:
        logger.exception("Groq API call failed")
        return None


def _ask_ollama(messages, temperature, response_format, timeout):
    base_url = (settings.OLLAMA_API_URL or "").rstrip("/")
    if not base_url:
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
        resp = requests.post(f"{base_url}/api/chat", json=payload, timeout=max(timeout, 60))
        resp.raise_for_status()
        content = resp.json()["message"]["content"]
        # Ba'zi modellar think=False'ni bilmaydi — <think> bloklarini tozalaymiz
        return re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL).strip()
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
