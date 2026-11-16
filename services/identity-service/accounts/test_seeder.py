import json
import os
from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase

from accounts.models import User


class DemoIdentitySeederTests(TestCase):
    def seed(self):
        output = StringIO()
        with patch.dict(os.environ, {"TEMORA_SEEDING_ENABLED": "true", "TEMORA_ENVIRONMENT": "test"}):
            call_command("seed_demo", seed=73, size="small", stdout=output)
        return json.loads(output.getvalue())

    def test_users_are_repeatable_and_passwords_are_never_returned(self):
        first = self.seed()
        self.seed()
        users = User.objects.filter(email__startswith="temora-demo-73-", email__endswith="@demo.temora.invalid")
        self.assertEqual(users.count(), 20)
        self.assertEqual(len(first["users"]), 20)
        self.assertTrue(all(user.email_verified and user.is_active for user in users))
        self.assertTrue(all(user.has_usable_password() for user in users))
        self.assertNotIn("password", first["users"][0])

    def test_cleanup_preserves_referenced_seed_users_and_real_users(self):
        self.seed()
        protected = User.objects.filter(email__startswith="temora-demo-73-").first()
        genuine = User.objects.create_user(
            email="person@example.com",
            password="a-random-test-only-password",
            full_name="A genuine user",
        )
        with patch.dict(os.environ, {"TEMORA_SEEDING_ENABLED": "true", "TEMORA_ENVIRONMENT": "test"}):
            call_command("seed_demo", seed=73, cleanup=True, preserve_user_id=[str(protected.id)], stdout=StringIO())
        self.assertTrue(User.objects.filter(id=protected.id).exists())
        self.assertTrue(User.objects.filter(id=genuine.id).exists())
        self.assertEqual(User.objects.filter(email__startswith="temora-demo-73-").count(), 1)
