"""Tests for Task 5 — Database Connection Management (CONN_MAX_AGE, health checks, budget & recovery)."""
import io
import json

import dj_database_url
from django.contrib.auth.models import User
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import connection
from django.test import TestCase, TransactionTestCase

from core.management.commands.check_db_connections import calculate_connection_budget


class DatabaseConnectionManagementTests(TestCase):
    def test_postgres_url_parsing_enables_persistent_connections_and_health_checks(self):
        parsed = dj_database_url.parse(
            'postgres://ilmildizi:StrongPass123!@db:5432/ilmildizi',
            conn_max_age=60,
            conn_health_checks=True,
        )
        self.assertEqual(parsed['CONN_MAX_AGE'], 60)
        self.assertTrue(parsed['CONN_HEALTH_CHECKS'])

    def test_production_worker_budget_stays_within_postgres_max_connections(self):
        budget = calculate_connection_budget(workers=4, threads_per_worker=16, max_connections=200)
        self.assertEqual(budget['steady_state_connections'], 8)
        self.assertEqual(budget['worst_case_connections'], 64)
        self.assertLess(budget['worst_case_utilization_pct'], 35.0)
        self.assertFalse(budget['pgbouncer_recommended'])

    def test_excessive_worker_budget_flags_pgbouncer_recommendation(self):
        budget = calculate_connection_budget(workers=12, threads_per_worker=16, max_connections=200)
        self.assertEqual(budget['worst_case_connections'], 192)
        self.assertTrue(budget['pgbouncer_recommended'])
        out = io.StringIO()
        with self.assertRaises(CommandError):
            call_command(
                'check_db_connections',
                workers=12,
                threads=16,
                max_connections=200,
                fail_on_warn=True,
                stdout=out,
            )

    def test_check_db_connections_command_outputs_valid_json_report(self):
        out = io.StringIO()
        call_command('check_db_connections', workers=4, threads=16, stdout=out)
        data = json.loads(out.getvalue())
        self.assertEqual(data['workers'], 4)
        self.assertEqual(data['worst_case_connections'], 64)
        if connection.vendor == 'postgresql':
            self.assertIn('live_total', data)
            self.assertGreaterEqual(data['live_total'], 1)


class DatabaseConnectionRecoveryTests(TransactionTestCase):
    def test_connection_recovery_after_explicit_close(self):
        User.objects.create_user(username='conn_recovery_u1')
        connection.close()
        # Next query must transparently re-establish the connection without error
        self.assertTrue(User.objects.filter(username='conn_recovery_u1').exists())
