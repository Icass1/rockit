"""Social relationships and listen sessions against a disposable PostgreSQL DB."""

import pytest
from sqlalchemy import insert
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.access.collectionAccess import shared_metadata
from backend.core.access.friend.friendAccess import FriendAccess
from backend.core.access.notificationAccess import NotificationAccess
from backend.core.access.friend.listenTogetherAccess import ListenTogetherAccess
from backend.core.enums.friend.friendStatusEnum import FriendStatusEnum
from backend.core.enums.friend.listenTogetherStatusEnum import ListenTogetherStatusEnum
from backend.core.framework.friend.friend import Friend
from backend.core.framework.friend.listenTogether import ListenTogether
from backend.core.framework.friend.sharing import Sharing

pytestmark = pytest.mark.integration


@pytest.fixture
async def social(database: AsyncSession) -> AsyncSession:
    for name, enum in (
        ("friend_status_enum", FriendStatusEnum),
        ("listen_together_status_enum", ListenTogetherStatusEnum),
    ):
        await database.execute(
            insert(shared_metadata.tables[f"core.{name}"]),
            [dict(key=e.value, value=e.name) for e in enum],
        )
    await database.commit()
    return database


async def befriend(session: AsyncSession) -> None:
    sent = await Friend.send_friend_request_async(session, 1, 2, None)
    assert sent.is_ok(), sent.info()
    accepted = await Friend.accept_friend_request_async(
        session, 2, sent.result().public_id
    )
    assert accepted.is_ok(), accepted.info()
    await session.commit()


async def test_pending_duplicates_and_request_ownership(social: AsyncSession) -> None:
    first = await Friend.send_friend_request_async(social, 1, 2, None)
    assert first.is_ok(), first.info()
    for sender, recipient in ((1, 2), (2, 1)):
        duplicate = await Friend.send_friend_request_async(
            social, sender, recipient, None
        )
        assert duplicate.is_not_ok()
    denied = await Friend.accept_friend_request_async(
        social, 1, first.result().public_id
    )
    assert denied.is_not_ok()
    accepted = await Friend.accept_friend_request_async(
        social, 2, first.result().public_id
    )
    assert accepted.is_ok(), accepted.info()
    assert (await Friend.require_friend_async(social, 1, 2)).is_ok()
    recipient_notifications = await NotificationAccess.list_async(social, 2)
    sender_notifications = await NotificationAccess.list_async(social, 1)
    assert recipient_notifications.is_ok()
    assert len(recipient_notifications.result()) == 1
    assert recipient_notifications.result()[0].event_key == (
        f"friend_request:{first.result().public_id}"
    )
    assert sender_notifications.is_ok() and sender_notifications.result() == []


async def test_remove_deletes_both_directions(social: AsyncSession) -> None:
    await befriend(social)
    removed = await Friend.remove_friend_async(social, 1, 2)
    assert removed.is_ok(), removed.info()
    for a, b in ((1, 2), (2, 1)):
        relation = await FriendAccess.get_friend_relationship_async(social, a, b)
        assert relation.is_not_ok()


async def test_session_requires_friendship_explicit_join_and_host_authority(
    social: AsyncSession,
) -> None:
    assert (await ListenTogether.invite_async(social, 1, 2)).is_not_ok()
    await befriend(social)
    invite = await ListenTogether.invite_async(social, 1, 2)
    assert invite.is_ok(), invite.info()
    row = invite.result()
    assert row.status == ListenTogetherStatusEnum.INVITED
    assert (await ListenTogether.join_async(social, 1, row.public_id)).is_not_ok()
    joined = await ListenTogether.join_async(social, 2, row.public_id)
    assert joined.is_ok(), joined.info()
    assert joined.result().status == ListenTogetherStatusEnum.ACTIVE
    assert (
        await ListenTogether.sync_async(social, 2, row.public_id, current_time_ms=3000)
    ).is_not_ok()
    synced = await ListenTogether.sync_async(
        social, 1, row.public_id, current_time_ms=3000, is_playing=True
    )
    assert synced.is_ok(), synced.info()
    assert synced.result().current_time_ms == 3000
    assert (await ListenTogether.leave_async(social, 2, row.public_id)).is_ok()
    assert (
        await ListenTogether.sync_async(social, 1, row.public_id, current_time_ms=5000)
    ).is_not_ok()


async def test_block_ends_session_and_prevents_reverse_requests(
    social: AsyncSession,
) -> None:
    await befriend(social)
    invited = await ListenTogether.invite_async(social, 1, 2)
    assert invited.is_ok(), invited.info()
    session_id = invited.result().public_id
    assert (await Friend.block_user_async(social, 2, 1)).is_ok()
    assert (await Friend.require_friend_async(social, 1, 2)).is_not_ok()
    assert (await Friend.send_friend_request_async(social, 1, 2, None)).is_not_ok()
    assert (await ListenTogether.join_async(social, 2, session_id)).is_not_ok()
    active = await ListenTogetherAccess.get_active_sessions_for_user_async(social, 1)
    assert active.is_ok() and active.result() == []
    assert (await Friend.unblock_user_async(social, 1, 2)).is_not_ok()
    assert (await Friend.unblock_user_async(social, 2, 1)).is_ok()
    assert (await Friend.require_friend_async(social, 1, 2)).is_not_ok()


async def test_share_checks_private_collection_access(
    large_playlist: AsyncSession,
) -> None:
    session = large_playlist
    for name, enum in (
        ("friend_status_enum", FriendStatusEnum),
        ("listen_together_status_enum", ListenTogetherStatusEnum),
    ):
        await session.execute(
            insert(shared_metadata.tables[f"core.{name}"]),
            [dict(key=e.value, value=e.name) for e in enum],
        )
    await befriend(session)
    forbidden = await Sharing.share_media_async(session, 1, 2, "list-12", None)
    assert forbidden.is_not_ok()
    shared = await Sharing.share_media_async(
        session, 1, 2, "song-1000", "Listen to this"
    )
    assert shared.is_ok(), shared.info()
    recipient_notifications = await NotificationAccess.list_async(session, 2)
    sender_notifications = await NotificationAccess.list_async(session, 1)
    assert recipient_notifications.is_ok()
    assert any(
        item.event_key == f"media_share:{shared.result().public_id}"
        for item in recipient_notifications.result()
    )
    assert sender_notifications.is_ok() and sender_notifications.result() == []
    public_id = shared.result().public_id
    assert (await Sharing.mark_as_seen_async(session, 1, public_id)).is_not_ok()
    assert (await Sharing.mark_as_seen_async(session, 2, public_id)).is_ok()
    inbox = await Sharing.get_inbox_async(session, 2)
    assert inbox.is_ok(), inbox.info()
    presented = await Sharing.present_async(session, 2, inbox.result())
    assert presented.is_ok(), presented.info()
    item = presented.result()[0]
    assert item.mediaPublicId == "song-1000" and item.mediaType == "song"
    assert item.senderUsername == "user-1" and item.recipientUsername == "user-2"
    assert item.mediaName == "Track 1000"
    empty = await Sharing.present_async(session, 2, [])
    assert empty.is_ok() and empty.result() == []


async def test_http_contract_and_profile_privacy(social: AsyncSession) -> None:
    from collections.abc import Awaitable, Callable
    from fastapi import FastAPI, Request, Response
    from httpx import ASGITransport, AsyncClient
    from backend.core.controllers.friendController import router
    from backend.core.middlewares.authMiddleware import AuthMiddleware
    from backend.core.utils.afterCommit import run_after_commit
    from backend.core.access.db.ormModels.user import UserRow

    app = FastAPI()

    async def authenticated(request: Request) -> None:
        user = await social.get(UserRow, int(request.headers.get("x-test-user", "1")))
        assert user is not None
        request.state.user = user

    app.dependency_overrides[AuthMiddleware.auth_dependency] = authenticated

    async def social_session_scope(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        request.state.db = social
        response = await call_next(request)
        if response.status_code < 400:
            await social.commit()
            await run_after_commit(social)
        else:
            await social.rollback()
            social.info.clear()
        return response

    app.middleware("http")(social_session_scope)
    app.include_router(router)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        forbidden = await client.get("/friends/user-2/stats")
        assert forbidden.status_code in (400, 403, 404), forbidden.text
        sent = await client.post("/friends/request/user-2")
        assert sent.status_code == 200, sent.text
        found = await client.get("/friends/search", params={"q": "user-2"})
        assert (
            found.status_code == 200
            and found.json()["results"][0]["requestSent"] is True
        )
        incoming = await client.get("/friends/requests", headers={"x-test-user": "2"})
        assert incoming.status_code == 200, incoming.text
        assert incoming.json()["incoming"][0]["status"] == "pending"
        request_id = incoming.json()["incoming"][0]["publicId"]
        accepted = await client.post(
            f"/friends/request/{request_id}/accept", headers={"x-test-user": "2"}
        )
        assert accepted.status_code == 200, accepted.text
        listing = await client.get("/friends")
        assert listing.status_code == 200, listing.text
        assert listing.json()["friends"][0]["username"] == "user-2"
        invited = await client.post(
            "/friends/listen-together/invite", json={"userPublicId": "user-2"}
        )
        assert invited.status_code == 200, invited.text
        sessions = await client.get(
            "/friends/listen-together/sessions", headers={"x-test-user": "2"}
        )
        assert sessions.status_code == 200, sessions.text
        data = sessions.json()["sessions"][0]
        assert data["status"] == "invited" and data["updatedAt"]
        session_id = data["publicId"]
        joined = await client.post(
            "/friends/listen-together/join",
            headers={"x-test-user": "2"},
            json={"sessionPublicId": session_id},
        )
        assert joined.status_code == 200, joined.text
        negative = await client.post(
            "/friends/listen-together/sync",
            json={"sessionPublicId": session_id, "currentTimeMs": -1},
        )
        assert negative.status_code == 422
        synced = await client.post(
            "/friends/listen-together/sync",
            json={
                "sessionPublicId": session_id,
                "currentTimeMs": 1000,
                "isPlaying": False,
            },
        )
        assert synced.status_code == 200, synced.text
        leaderboard = await client.get("/friends/leaderboard")
        assert leaderboard.status_code == 200, leaderboard.text
        profiles = leaderboard.json()["entries"]
        assert {profile["userId"] for profile in profiles} == {"user-1", "user-2"}
        for profile in profiles:
            assert profile["songsListened"] * 10 == profile["xp"]
            assert profile["levelStartXp"] <= profile["xp"]
        blocked = await client.post("/friends/block/user-2")
        assert blocked.status_code == 200, blocked.text
        block_list = await client.get("/friends/blocked")
        assert (
            block_list.status_code == 200
            and block_list.json()["friends"][0]["status"] == "blocked"
        )
        assert (await client.get("/friends/listen-together/sessions")).json()[
            "sessions"
        ] == []
        assert (await client.delete("/friends/block/user-2")).status_code == 200
        assert (await client.get("/friends")).json()["friends"] == []


async def test_notifications_are_deferred_and_deduplicated(
    social: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    from unittest.mock import AsyncMock
    from backend.core.framework.friend.notifications import notify_after_commit
    from backend.core.framework.websocket.webSocketManager import ws_manager
    from backend.core.utils.afterCommit import run_after_commit

    send = AsyncMock()
    monkeypatch.setattr(ws_manager, "send_to_user_async", send)
    notify_after_commit(social, [1, 2])
    notify_after_commit(social, [2])
    send.assert_not_awaited()
    await social.commit()
    await run_after_commit(social)
    assert send.await_count == 2
    await run_after_commit(social)
    assert send.await_count == 2
