"""Single source of truth for "which subject is the student currently browsing".

Resolved from ?subject=<slug> when present (and remembered in the session), else the
saved session value, else the first subject. Shared by the Test Center, Learning, the
AI Mentor and Battles so switching subject anywhere carries everywhere.
"""
from .models import Subject


def resolve_subject(request, subjects=None):
    subjects = list(Subject.objects.all()) if subjects is None else subjects
    if not subjects:
        return None, []
    slug = request.GET.get('subject')
    selected = next((s for s in subjects if s.slug == slug), None) if slug else None
    if selected:
        request.session['selected_subject'] = selected.slug
    if selected is None:
        selected = next((s for s in subjects if s.slug == request.session.get('selected_subject')), None)
    return (selected or subjects[0]), subjects


def current_subject(request):
    """Just the Subject (or None) — for callers that don't need the full list."""
    return resolve_subject(request)[0]
