"""Reusable, config-driven CRUD views for the Super Admin panel.

Each managed section subclasses these and sets a handful of class attributes (columns,
search fields, filters, form) instead of re-implementing list/search/filter/sort/paginate/
bulk-delete and create/update/delete every time. Rows are rendered to plain cell lists in
Python (not resolved in the template) so column accessors can be arbitrary callables that
emit badges/HTML.
"""
from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin
from django.db.models import Q
from django.shortcuts import redirect, get_object_or_404, render
from django.urls import reverse
from django.utils.html import format_html
from django.views.generic import ListView, CreateView, UpdateView, View

from accounts.permissions import SuperAdminRequiredMixin


def badge(text, tone='slate'):
    tones = {
        'slate': 'bg-slate-100 text-slate-600',
        'green': 'bg-emerald-50 text-emerald-600',
        'blue': 'bg-blue-50 text-blue-600',
        'amber': 'bg-amber-50 text-amber-600',
        'rose': 'bg-rose-50 text-rose-600',
        'gray': 'bg-slate-100 text-slate-500',
    }
    return format_html('<span class="px-2 py-0.5 rounded-full text-[11px] font-semibold {}">{}</span>',
                       tones.get(tone, tones['slate']), text)


class Column:
    def __init__(self, label, accessor, sortable=None):
        self.label = label
        self.accessor = accessor        # attr-name string OR callable(obj)
        self.sortable = sortable        # order field name if this column is sortable

    def render(self, obj):
        if callable(self.accessor):
            return self.accessor(obj)
        value = obj
        for part in self.accessor.split('.'):
            value = getattr(value, part, '')
            if callable(value):
                value = value()
        return value if value is not None else ''


class PanelListView(SuperAdminRequiredMixin, ListView):
    template_name = 'panel/generic_list.html'
    paginate_by = 25

    title = ''
    icon = 'list'
    active_nav = ''
    columns = []                 # list[Column]
    search_fields = []
    search_placeholder = "Qidirish..."
    filters = []                 # list[dict(param,label,options=[(val,label)],lookup)]
    default_order = '-id'
    bulk_actions = []            # list[dict(value,label,tone)]
    row_actions = True           # show view/edit/delete per row
    create_url_name = None
    edit_url_name = None
    delete_url_name = None
    detail_url_name = None
    empty_text = "Hali ma'lumot yo'q."

    def get_base_queryset(self):
        return self.model._default_manager.all()

    def get_queryset(self):
        qs = self.get_base_queryset()
        q = self.request.GET.get('q', '').strip()
        if q and self.search_fields:
            cond = Q()
            for f in self.search_fields:
                cond |= Q(**{f + '__icontains': q})
            qs = qs.filter(cond)
        for f in self.filters:
            val = self.request.GET.get(f['param'], '')
            if val != '':
                qs = qs.filter(**{f['lookup']: val})
        order = self.request.GET.get('order', self.default_order)
        allowed = {self.default_order}
        for c in self.columns:
            if c.sortable:
                allowed.add(c.sortable)
                allowed.add('-' + c.sortable)
        if order not in allowed:
            order = self.default_order
        return qs.order_by(order)

    def _url(self, name, obj):
        return reverse(name, args=[obj.pk]) if name else None

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        rows = []
        for obj in ctx['object_list']:
            rows.append({
                'pk': obj.pk,
                'cells': [c.render(obj) for c in self.columns],
                'detail_url': self._url(self.detail_url_name, obj),
                'edit_url': self._url(self.edit_url_name, obj),
                'delete_url': self._url(self.delete_url_name, obj),
            })
        ctx.update({
            'title': self.title,
            'icon': self.icon,
            'active_nav': self.active_nav,
            'columns': self.columns,
            'rows': rows,
            'search_fields': self.search_fields,
            'search_placeholder': self.search_placeholder,
            'filters_conf': self.filters,
            'bulk_actions': self.bulk_actions,
            'row_actions': self.row_actions,
            'create_url': reverse(self.create_url_name) if self.create_url_name else None,
            'empty_text': self.empty_text,
            'current_q': self.request.GET.get('q', ''),
            'current_order': self.request.GET.get('order', self.default_order),
            'current_filters': {f['param']: self.request.GET.get(f['param'], '') for f in self.filters},
            'querystring': self._querystring(drop=['page']),
            'qs_sort_base': self._querystring(drop=['page', 'order']),
        })
        return ctx

    def _querystring(self, drop):
        params = self.request.GET.copy()
        for key in drop:
            params.pop(key, None)
        return params.urlencode()

    def post(self, request, *args, **kwargs):
        """Bulk actions: an 'action' plus a list of 'selected' pks."""
        action = request.POST.get('action', '')
        ids = request.POST.getlist('selected')
        valid = {a['value'] for a in self.bulk_actions}
        if action not in valid or not ids:
            messages.warning(request, "Amal yoki qatorlar tanlanmadi.")
            return redirect(request.get_full_path())
        qs = self.get_base_queryset().filter(pk__in=ids)
        count = self.perform_bulk_action(action, qs)
        messages.success(request, f"{count} ta yozuvga '{action}' amali qo'llandi.")
        return redirect(request.get_full_path())

    def perform_bulk_action(self, action, queryset):
        if action == 'delete':
            n = queryset.count()
            queryset.delete()
            return n
        return 0


class PanelFormMixin(SuperAdminRequiredMixin):
    template_name = 'panel/generic_form.html'
    title = ''
    active_nav = ''
    cancel_url_name = None

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx['title'] = self.title
        ctx['active_nav'] = self.active_nav
        ctx['cancel_url'] = reverse(self.cancel_url_name) if self.cancel_url_name else None
        return ctx


class PanelCreateView(PanelFormMixin, CreateView):
    def form_valid(self, form):
        resp = super().form_valid(form)
        messages.success(self.request, "Muvaffaqiyatli yaratildi.")
        return resp


class PanelUpdateView(PanelFormMixin, UpdateView):
    def form_valid(self, form):
        resp = super().form_valid(form)
        messages.success(self.request, "O'zgarishlar saqlandi.")
        return resp


class PanelDeleteView(SuperAdminRequiredMixin, View):
    """POST-only delete with a GET confirmation page. `model`, `success_url_name`, and
    optionally `protect(obj)` (return a message string to block deletion) are configured
    by subclasses."""
    model = None
    template_name = 'panel/confirm_delete.html'
    success_url_name = None
    title = "O'chirish"
    active_nav = ''

    def get_object(self):
        return get_object_or_404(self.model, pk=self.kwargs['pk'])

    def protect(self, obj):
        return None

    def get(self, request, *args, **kwargs):
        obj = self.get_object()
        return render(request, self.template_name, {
            'object': obj, 'title': self.title, 'active_nav': self.active_nav,
            'blocked': self.protect(obj),
        })

    def post(self, request, *args, **kwargs):
        obj = self.get_object()
        blocked = self.protect(obj)
        if blocked:
            messages.error(request, blocked)
            return redirect(reverse(self.success_url_name))
        label = str(obj)
        obj.delete()
        messages.success(request, f"\"{label}\" o'chirildi.")
        return redirect(reverse(self.success_url_name))
