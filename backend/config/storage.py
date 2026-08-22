from whitenoise.storage import CompressedManifestStaticFilesStorage


class ResilientManifestStaticFilesStorage(CompressedManifestStaticFilesStorage):
    """Like WhiteNoise's hashed+compressed manifest storage, but non-strict.

    With the default (manifest_strict = True) a SINGLE `{% static %}` reference whose file
    isn't in staticfiles.json — e.g. a freshly committed image on a server where
    collectstatic hasn't run yet — raises ValueError and 500s *every* page that renders it
    (including login). That's a disproportionate outage for a missing asset. Non-strict
    mode falls back to the plain, unhashed path instead: the page still renders and only
    that one asset fails to load. Always run collectstatic on deploy; this is just a seatbelt.
    """
    manifest_strict = False
