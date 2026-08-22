from django import template

register = template.Library()


@register.filter
def get(mapping, key):
    """Dict lookup by a variable key (Django templates can't do mapping[var] natively).
    Used by the generic list template to read the currently-selected filter value."""
    try:
        return mapping.get(key, '')
    except AttributeError:
        return ''
