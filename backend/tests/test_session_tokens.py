import unittest
import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import Response
from jose import jwt
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.enums.platformEnum import PlatformEnum
from backend.core.framework.auth.session import Session


class SessionTokenTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.session = AsyncMock(spec=AsyncSession)
        self.secret = "test-session-signing-key-" * 3
        self.module = "backend.core.framework.auth.session"
        self.settings = patch.multiple(
            self.module,
            SESSION_TOKEN_SECRET=self.secret,
            SESSION_DURATION=3600,
            SESSION_DURATION_REMEMBER_ME=86400,
            ENVIRONMENT="DEV",
        )
        self.settings.start()
        self.addCleanup(self.settings.stop)
        self.row = SimpleNamespace(
            user_id=1,
            disabled=False,
            expires_at=datetime.now(tz=timezone.utc) + timedelta(hours=1),
        )
        self.lookup = AsyncMock(
            return_value=AResult(code=AResultCode.OK, message="OK", result=self.row)
        )
        lookup_patch = patch(
            f"{self.module}.SessionAccess.get_session_from_id_async", new=self.lookup
        )
        lookup_patch.start()
        self.addCleanup(lookup_patch.stop)

    def token(self, **overrides: object) -> str:
        """Sign test claims independently of session creation."""
        now = int(datetime.now(tz=timezone.utc).timestamp())
        claims = dict(
            iat=now,
            exp=now + 3600,
            sub="user-public-id",
            jti=str(uuid.uuid4()),
            platform="WEB",
            ip="192.0.2.1",
        )
        claims.update(overrides)
        return jwt.encode(claims=claims, key=self.secret, algorithm="HS256")

    async def test_creation_metadata_cookies_and_remember_me(self) -> None:
        create = AsyncMock(
            return_value=AResult(code=AResultCode.OK, message="OK", result=self.row)
        )
        with patch(f"{self.module}.SessionAccess.create_session_async", new=create):
            for platform, remember, ip, duration in [
                (PlatformEnum.WEB, False, "192.0.2.1", 3600),
                (PlatformEnum.MOBILE, True, None, 86400),
            ]:
                with self.subTest(platform=platform):
                    response = Response()
                    result = await Session.create_session_async(
                        session=self.session,
                        response=response,
                        platform=platform,
                        user_id=1,
                        user_public_id="user-public-id",
                        rembember_me=remember,
                        ip=ip,
                    )
                    self.assertTrue(result.is_ok())
                    token = result.result()
                    claims = jwt.decode(
                        token=token, key=self.secret, algorithms=["HS256"]
                    )
                    self.assertEqual(claims["sub"], "user-public-id")
                    self.assertEqual(claims["platform"], platform.name)
                    self.assertEqual(claims["ip"], ip)
                    self.assertEqual(claims["exp"] - claims["iat"], duration)
                    uuid.UUID(hex=claims["jti"])
                    self.assertNotIn("user_id", claims)
                    cookie = response.headers["set-cookie"]
                    self.assertIn(token, cookie)
                    self.assertIn("HttpOnly", cookie)
                    self.assertIn(f"Max-Age={duration}", cookie)
                    self.assertIn("SameSite=lax", cookie)
                    self.assertEqual(create.await_args.kwargs["session_id"], token)
                    self.assertEqual(
                        int(create.await_args.kwargs["expires_at"].timestamp()),
                        claims["exp"],
                    )

    async def test_valid_token_requires_stored_session(self) -> None:
        token = self.token()
        result = await Session.get_user_id_from_session_async(
            session=self.session, session_id=token
        )
        self.assertTrue(result.is_ok())
        self.lookup.assert_awaited_once_with(session=self.session, session_id=token)
        self.lookup.return_value = AResult(
            code=AResultCode.NOT_FOUND, message="Session not found"
        )
        result = await Session.get_user_id_from_session_async(
            session=self.session, session_id=token
        )
        self.assertTrue(result.is_not_ok())

    async def test_tampering_wrong_key_and_algorithm_are_rejected(self) -> None:
        claims = jwt.get_unverified_claims(token=self.token())
        invalid_tokens = [
            jwt.encode(claims=claims, key="wrong-key", algorithm="HS256"),
            jwt.encode(claims=claims, key=self.secret, algorithm="HS512"),
            "malformed.token.signature",
        ]
        claims["sub"] = "another-user"
        tampered_payload = self.token(sub="another-user").split(".")[1]
        original = self.token().split(".")
        invalid_tokens.append(f"{original[0]}.{tampered_payload}.{original[2]}")
        for token in invalid_tokens:
            result = await Session.get_user_id_from_session_async(
                session=self.session, session_id=token
            )
            self.assertTrue(result.is_not_ok())
        self.lookup.assert_not_awaited()

    async def test_expired_future_and_invalid_claims_are_rejected(self) -> None:
        now = int(datetime.now(tz=timezone.utc).timestamp())
        for overrides in [
            dict(exp=now - 1),
            dict(exp=now),
            dict(iat=now + 120),
            dict(iat=now, exp=now),
            dict(platform="UNKNOWN"),
            dict(iat="invalid"),
            dict(ip=123),
        ]:
            with self.subTest(overrides=overrides):
                result = await Session.get_user_id_from_session_async(
                    session=self.session, session_id=self.token(**overrides)
                )
                self.assertTrue(result.is_not_ok())
        self.lookup.assert_not_awaited()

    async def test_all_metadata_claims_are_required(self) -> None:
        claims = jwt.get_unverified_claims(token=self.token())
        for claim in claims:
            incomplete = {key: value for key, value in claims.items() if key != claim}
            token = jwt.encode(claims=incomplete, key=self.secret, algorithm="HS256")
            result = await Session.get_user_id_from_session_async(
                session=self.session, session_id=token
            )
            self.assertTrue(result.is_not_ok())
        self.lookup.assert_not_awaited()

    async def test_disabled_and_expired_database_sessions_are_rejected(self) -> None:
        for token in (self.token(), str(uuid.uuid4())):
            for disabled, expires in [
                (True, datetime.now(tz=timezone.utc) + timedelta(hours=1)),
                (False, datetime.now(tz=timezone.utc) - timedelta(seconds=1)),
            ]:
                self.row.disabled = disabled
                self.row.expires_at = expires
                result = await Session.get_user_id_from_session_async(
                    session=self.session, session_id=token
                )
                self.assertTrue(result.is_not_ok())

    async def test_legacy_uuid_sessions_remain_valid(self) -> None:
        result = await Session.get_user_id_from_session_async(
            session=self.session, session_id=str(uuid.uuid4())
        )
        self.assertTrue(result.is_ok())

    async def test_logout_revokes_token(self) -> None:
        token = self.token()
        disable = AsyncMock(return_value=AResultCode(code=AResultCode.OK, message="OK"))
        with patch(
            f"{self.module}.SessionAccess.disable_session_from_session_id_async",
            new=disable,
        ):
            result = await Session.end_session_async(
                session=self.session, session_id=token
            )
        self.assertTrue(result.is_ok())
        disable.assert_awaited_once_with(session=self.session, session_id=token)

    async def test_database_failure_does_not_set_cookie(self) -> None:
        create = AsyncMock(
            return_value=AResult(
                code=AResultCode.GENERAL_ERROR, message="Database error"
            )
        )
        response = Response()
        with patch(f"{self.module}.SessionAccess.create_session_async", new=create):
            result = await Session.create_session_async(
                session=self.session,
                response=response,
                platform=PlatformEnum.WEB,
                user_id=1,
                user_public_id="user-public-id",
                rembember_me=False,
                ip=None,
            )
        self.assertTrue(result.is_not_ok())
        self.assertNotIn("set-cookie", response.headers)


if __name__ == "__main__":
    unittest.main()
