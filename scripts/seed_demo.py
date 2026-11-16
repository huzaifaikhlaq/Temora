"""Compose orchestrator for the service-owned Temora demo seed commands."""

import argparse
import base64
import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SIZES = {"small": 100, "medium": 1000, "large": 10000}


def compose_command(service, seed, *, size=None, cleanup=False, dry_run=False, payload=None, extra_args=None):
    argv = ["docker", "compose", "exec", "-T", service, "python", "manage.py", "seed_demo", "--seed", str(seed)]
    if size:
        argv.extend(["--size", size])
    if cleanup:
        argv.append("--cleanup")
    if dry_run:
        argv.append("--dry-run")
    if extra_args:
        argv.extend(extra_args)
    if payload is not None:
        encoded_manifest = base64.b64encode(
            json.dumps(payload, separators=(",", ":")).encode("utf-8")
        ).decode("ascii")
        argv.extend(["--manifest-base64", encoded_manifest])
    result = subprocess.run(
        argv,
        cwd=ROOT,
        input="",
        text=True,
        capture_output=True,
    )
    if result.returncode:
        if result.stderr:
            sys.stderr.write(result.stderr)
        if result.stdout:
            sys.stderr.write(result.stdout)
        raise RuntimeError(f"{service} seed command failed with exit code {result.returncode}.")
    try:
        response = json.loads(result.stdout.strip())
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"{service} command returned unexpected output: {result.stdout[-1000:]}") from exc
    print(f"{service}: {json.dumps(response, sort_keys=True)}")
    return response


def main():
    parser = argparse.ArgumentParser(description="Seed or clean Temora development data using its service-owned databases.")
    parser.add_argument("--size", choices=SIZES, default="medium")
    parser.add_argument("--seed", type=int, default=41)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--cleanup", action="store_true", help="Remove only records marked with this seed number.")
    parser.add_argument("--additional-member-id", action="append", default=[], help="Add an existing local user to every generated workspace.")
    args = parser.parse_args()
    if not 0 <= args.seed <= 999_999_999:
        parser.error("--seed must be between 0 and 999999999")

    try:
        if args.cleanup:
            generated_users = compose_command("identity", args.seed, cleanup=True, dry_run=True)
            issue_result = compose_command("issue", args.seed, cleanup=True, dry_run=args.dry_run)
            project_args = [arg for project_id in issue_result.get("preserved_project_ids", []) for arg in ("--preserve-project-id", project_id)]
            project_result = compose_command("project", args.seed, cleanup=True, dry_run=args.dry_run, extra_args=project_args)
            workspace_args = [arg for workspace_id in project_result.get("preserved_workspace_ids", []) for arg in ("--preserve-workspace-id", workspace_id)]
            workspace_args.extend(arg for user_id in generated_users.get("generated_user_ids", []) for arg in ("--generated-user-id", user_id))
            workspace_args.extend(arg for user_id in args.additional_member_id for arg in ("--additional-member-id", user_id))
            workspace_result = compose_command("workspace", args.seed, cleanup=True, dry_run=args.dry_run, extra_args=workspace_args)
            referenced_users = set(workspace_result.get("preserved_user_ids", []))
            preserve_user_args = [
                arg
                for user_id in generated_users.get("generated_user_ids", [])
                if user_id in referenced_users
                for arg in ("--preserve-user-id", user_id)
            ]
            compose_command("identity", args.seed, cleanup=True, dry_run=args.dry_run, extra_args=preserve_user_args)
            return 0

        manifest = compose_command("identity", args.seed, size=args.size, dry_run=args.dry_run)
        if args.dry_run:
            print("Dry run complete; no demo records were created.")
            return 0
        workspace_args = [arg for member_id in args.additional_member_id for arg in ("--additional-member-id", member_id)]
        manifest = compose_command("workspace", args.seed, payload=manifest, extra_args=workspace_args)
        manifest = compose_command("project", args.seed, payload=manifest)
        compose_command("issue", args.seed, payload=manifest)
    except (RuntimeError, OSError) as exc:
        print(f"Seeder stopped: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
