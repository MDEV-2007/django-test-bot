def site_settings(request):
    """Exposes the singleton site name/logo to every template (panels use it in the
    sidebar/title). Guarded so a missing table during early migrations can't 500 the site."""
    name, logo = "Ilm Mevasi", ""
    try:
        from .models import SiteSettings
        s = SiteSettings.load()
        name, logo = s.site_name, s.logo_url
    except Exception:
        pass
    return {'site_name': name, 'site_logo': logo}
