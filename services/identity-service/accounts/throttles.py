import hashlib
import time

from django.conf import settings

from redis import Redis, RedisError

from rest_framework.exceptions import APIException
from rest_framework.throttling import BaseThrottle


LUA = """
local n = redis.call('INCR', KEYS[1])

if n == 1 then
    redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1]))
end

return n
"""


class RateLimitUnavailable(APIException):

    status_code = 503

    default_detail = (
        "Authentication temporarily unavailable"
    )


class AtomicAuthThrottle(BaseThrottle):

    scope = "auth"

    limit = 10

    seconds = 60

    def allow_request(self, request, view):

        ip = request.META.get(
            "REMOTE_ADDR",
            "unknown"
        )

        email = (
            request.data.get("email", "")
            if isinstance(request.data, dict)
            else ""
        )

        if not isinstance(email, str):
            email = ""

        keys = ["ip:" + ip]

        if email:
            keys.append(
                "email:" + email.strip().lower()
            )

        bucket = int(time.time()) // self.seconds

        redis = Redis.from_url(
            settings.REDIS_URL,
            socket_connect_timeout=2,
            socket_timeout=2
        )

        try:
            for part in keys:

                digest = hashlib.sha256(
                    part.encode()
                ).hexdigest()

                key = (
                    f"temora:ratelimit:"
                    f"{self.scope}:{digest}:{bucket}"
                )

                count = redis.eval(
                    LUA,
                    1,
                    key,
                    self.seconds * 2
                )

                if count > self.limit:
                    return False

        except RedisError as exc:
            raise RateLimitUnavailable() from exc

        return True

    def wait(self):
        return self.seconds


class RegisterThrottle(AtomicAuthThrottle):
    scope = "register"
    limit = 5
    seconds = 3600


class LoginThrottle(AtomicAuthThrottle):
    scope = "login"
    limit = 10
    seconds = 60


class RecoverThrottle(AtomicAuthThrottle):
    scope = "recover"
    limit = 5
    seconds = 3600


class VerifyThrottle(AtomicAuthThrottle):
    scope = "verify"
    limit = 15
    seconds = 3600