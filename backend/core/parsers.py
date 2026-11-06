"""Project-wide JSON parser (audit API-003).

Every API view reads `request.data.get(...)`. A top-level JSON array (`[1, 2]`) parsed
into a list made 61 endpoints — login and register included — crash with AttributeError
(HTTP 500, on demand, unauthenticated). No endpoint accepts a bare array, so the body
must be a JSON object; anything else is a 400.
"""
from rest_framework.exceptions import ParseError
from rest_framework.parsers import JSONParser


class ObjectJSONParser(JSONParser):
    def parse(self, stream, media_type=None, parser_context=None):
        data = super().parse(stream, media_type, parser_context)
        if not isinstance(data, dict):
            raise ParseError("JSON obyekt kutilgan (masalan {\"key\": \"value\"}).")
        return data
