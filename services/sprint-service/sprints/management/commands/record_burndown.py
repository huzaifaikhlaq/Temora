from django.core.management.base import BaseCommand

from sprints.models import Sprint
from sprints.services import store_snapshot


class Command(BaseCommand):
    help = "Record daily burndown snapshots for active sprints."

    def handle(self, *args, **options):
        sprints = Sprint.objects.filter(
            status=Sprint.Status.ACTIVE
        )

        completed = 0
        failed = 0

        for sprint in sprints.iterator():
            try:
                store_snapshot(sprint)
                completed += 1

            except Exception as exc:
                failed += 1

                self.stderr.write(
                    f"Sprint {sprint.id}: {exc}"
                )

        self.stdout.write(
            f"Recorded: {completed}, Failed: {failed}"
        )

        if failed:
            raise RuntimeError(
                "One or more sprint snapshots failed."
            )