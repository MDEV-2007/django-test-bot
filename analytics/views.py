from django.contrib.auth.decorators import login_required
from django.shortcuts import render

from accounts.models import ensure_profile_for_user

from . import services


@login_required
def dashboard(request):
    profile = ensure_profile_for_user(request.user)
    data = services.dashboard_data(profile)

    # Only the numeric datasets go to the client for Chart.js; tiles, the weak/strong
    # lists and the history table are rendered server-side from `data`.
    charts = {
        'radar': data['mastery']['radar'],
        'daily': data['daily'],
        'weekly': data['weekly'],
        'subject_dist': data['subject_dist'],
        'accuracy_breakdown': data['accuracy_breakdown'],
    }
    return render(request, 'analytics/dashboard.html', {
        'profile': profile,
        'data': data,
        'charts': charts,
    })
