import json
import time

import redis

from django.conf import settings

from django.core.management.base import (
    BaseCommand,
)

from django.db import (
    transaction,
    close_old_connections,
    DatabaseError,
)

from django.utils import timezone

from issues.models import IssueEvent


def publish_one(client):

    with transaction.atomic():

        event = (
            IssueEvent.objects
            .select_for_update(
                skip_locked=True,
            )
            .filter(
                published_at__isnull=True,
            )
            .order_by(
                "created_at",
                "id",
            )
            .first()
        )

        if event is None:
            return False

        client.xadd(
            settings.ISSUE_EVENTS_STREAM,

            {
                "event_id": str(event.id),

                "event_type": event.event_type,

                "occurred_at": (
                    event.created_at.isoformat()
                ),

                "payload": json.dumps(
                    event.payload,
                ),
            },
        )

        event.published_at = timezone.now()

        event.save(
            update_fields=["published_at"],
        )

        return True


class Command(BaseCommand):

    help = "Publish pending issue events to Redis Streams."

    def add_arguments(self, parser):

        parser.add_argument(
            "--once",
            action="store_true",
            help="Publish up to 100 pending events and exit.",
        )

    def handle(self, *args, **options):

        client = redis.Redis.from_url(
            settings.ISSUE_EVENTS_REDIS_URL,

            decode_responses=True,

            socket_connect_timeout=3,

            socket_timeout=3,
        )

        self.stdout.write(
            self.style.SUCCESS(
                "Issue event publisher started."
            )
        )

        try:

            while True:

                close_old_connections()

                try:
                    published_count = 0

                    for _ in range(100):

                        if not publish_one(client):
                            break

                        published_count += 1

                    if published_count:

                        self.stdout.write(
                            f"Published {published_count} events."
                        )

                    if options["once"]:
                        return

                    time.sleep(
                        0.1 if published_count == 100 else 2
                    )

                except (
                    redis.RedisError,
                    DatabaseError,
                ) as exc:

                    self.stderr.write(
                        f"Publishing failed: {type(exc).__name__}"
                    )

                    if options["once"]:
                        raise

                    time.sleep(5)

        except KeyboardInterrupt:

            self.stdout.write(
                "Issue event publisher stopped."
            )

        finally:
            client.close()