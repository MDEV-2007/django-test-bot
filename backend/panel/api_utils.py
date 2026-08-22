"""JSON version of panel/generic.py's PanelListView search/filter/sort/paginate mechanics
— see panel/generic.py's module docstring for the original. Each section in panel/api.py
calls `list_response()` with its own queryset/search_fields/filters/row serializer instead
of subclassing a CBV, since there's no template to render here."""
from django.core.paginator import Paginator
from django.db.models import Q
from rest_framework.response import Response


def list_response(request, *, queryset, search_fields=(), filters=(), sortable_fields=(),
                   default_order='-id', row_fn=None, extra=None):
    """`filters`: iterable of {param, lookup, options}. `sortable_fields`: iterable of field
    names a client may sort by (both `field` and `-field` are allowed) besides `default_order`.
    `row_fn(obj) -> dict` builds one row's JSON; if omitted, rows are omitted (caller only
    wants the count/filters, e.g. for a stats-only response)."""
    q = request.query_params.get('q', '').strip()
    if q and search_fields:
        cond = Q()
        for f in search_fields:
            cond |= Q(**{f + '__icontains': q})
        queryset = queryset.filter(cond)

    active_filters = {}
    for f in filters:
        val = request.query_params.get(f['param'], '')
        active_filters[f['param']] = val
        if val != '':
            # __isnull (and other boolean lookups) reject a string rhs outright — Django's
            # IsNull.as_sql requires an actual bool, not "True"/"False" from the query string.
            if f['lookup'].endswith('__isnull') or f['lookup'] == 'is_active':
                val = val.lower() in ('true', '1')
            queryset = queryset.filter(**{f['lookup']: val})

    order = request.query_params.get('order', default_order)
    allowed = {default_order} | set(sortable_fields) | {'-' + f for f in sortable_fields}
    if order not in allowed:
        order = default_order
    queryset = queryset.order_by(order)

    page_number = request.query_params.get('page', 1)
    paginator = Paginator(queryset, 25)
    page = paginator.get_page(page_number)

    payload = {
        'results': [row_fn(obj) for obj in page] if row_fn else [],
        'count': paginator.count,
        'page': page.number,
        'num_pages': paginator.num_pages,
        'has_next': page.has_next(),
        'has_previous': page.has_previous(),
        'current_q': q,
        'current_order': order,
        'current_filters': active_filters,
    }
    if extra:
        payload.update(extra)
    return Response(payload)


def bulk_action(request, *, base_queryset, allowed_actions, perform_fn):
    action = request.data.get('action', '')
    ids = request.data.get('selected', [])
    if action not in allowed_actions or not ids:
        return Response({'error': 'Amal yoki qatorlar tanlanmadi.'}, status=400)
    qs = base_queryset.filter(pk__in=ids)
    count = perform_fn(action, qs)
    return Response({'ok': True, 'count': count})
