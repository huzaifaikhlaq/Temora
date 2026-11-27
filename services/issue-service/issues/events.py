from .models import IssueEvent


def record_comment_event(
    event_type,
    comment,
    actor_id,
    new_mentions=None,
):

    issue = comment.issue

    return IssueEvent.objects.create(
        event_type=event_type,

        payload={
            "schema_version": 1,

            "workspace_id": str(issue.workspace_id),

            "project_id": str(issue.project_id),

            "issue_id": str(issue.id),

            "issue_key": issue.key,

            "comment_id": str(comment.id),

            "actor_id": str(actor_id),

            "author_id": str(comment.author_id),

            "reporter_id": str(issue.reporter_id),

            "assignee_id": (
                str(issue.assignee_id)
                if issue.assignee_id
                else None
            ),

            "mentioned_user_ids": (
                comment.mentioned_user_ids
            ),

            "new_mentioned_user_ids": (
                new_mentions or []
            ),
        },
    )