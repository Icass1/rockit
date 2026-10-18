import unittest
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import WebSocket
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.framework.websocket.webSocketManager import WebSocketManager
from backend.core.framework.websocket.playbackState import UserPlaybackState
from backend.core.framework.websocket.handlers.current_time import handle_current_time
from backend.core.framework.websocket.handlers.current_media import handle_current_media
from backend.core.framework.websocket.handlers.media_ended import handle_media_ended
from backend.core.framework.websocket.handlers.seek import handle_seek


class PlaybackSyncTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.manager = WebSocketManager()
        self.owner = AsyncMock(spec=WebSocket)
        self.other = AsyncMock(spec=WebSocket)
        self.manager.playback_owners[1] = self.owner
        self.manager.user_playback_states[1] = UserPlaybackState(
            media_public_id="song",
            queue_media_id=2,
            playback_id="new",
            last_time_ms=1000,
        )
        self.session = AsyncMock(spec=AsyncSession)
        self.send_to_user = AsyncMock()
        self.manager.send_to_user_async = self.send_to_user

    async def test_delayed_video_and_previous_occurrence_are_discarded(self) -> None:
        with patch(
            "backend.core.framework.websocket.handlers.current_time.User.update_user_current_time",
            new_callable=AsyncMock,
        ) as update:
            for media, queue, playback in [
                ("video", 1, "old"),
                ("song", 2, "old"),
                ("song", 1, "new"),
            ]:
                await handle_current_time(
                    manager=self.manager,
                    session=self.session,
                    user_id=1,
                    sender_websocket=self.owner,
                    data=dict(
                        mediaPublicId=media,
                        queueMediaId=queue,
                        playbackId=playback,
                        currentTimeMs=1800000,
                    ),
                )
            update.assert_not_awaited()
            self.send_to_user.assert_not_awaited()
            self.assertEqual(self.manager.user_playback_states[1].last_time_ms, 1000)

    async def test_follower_cannot_publish_periodic_progress(self) -> None:
        await handle_current_time(
            manager=self.manager,
            session=self.session,
            user_id=1,
            sender_websocket=self.other,
            data=dict(
                mediaPublicId="song",
                queueMediaId=2,
                playbackId="new",
                currentTimeMs=90000,
            ),
        )
        self.send_to_user.assert_not_awaited()
        self.assertEqual(self.manager.user_playback_states[1].last_time_ms, 1000)

    async def test_song_change_resets_position_and_transfers_ownership(self) -> None:
        module = "backend.core.framework.websocket.handlers.current_media"
        ok = AResult(code=AResultCode.OK, message="OK", result=True)
        with patch(
            f"{module}.User.update_user_current_media", new=AsyncMock(return_value=ok)
        ), patch(
            f"{module}.User.update_user_current_time", new=AsyncMock(return_value=ok)
        ) as update, patch(
            f"{module}.close_listen_interval_async", new_callable=AsyncMock
        ):
            data = dict(
                mediaPublicId="next",
                queueMediaId=3,
                playbackId="next-session",
                queueType="SORTED",
            )
            await handle_current_media(
                manager=self.manager,
                session=self.session,
                user_id=1,
                sender_websocket=self.other,
                data=data,
            )
            self.assertEqual(self.manager.user_playback_states[1].last_time_ms, 0)
            self.assertIs(self.manager.playback_owners[1], self.other)
            assert update.await_args is not None
            self.assertEqual(update.await_args.kwargs["current_time_ms"], 0)
            assert self.send_to_user.await_args is not None
            relay = self.send_to_user.await_args.kwargs["message"]
            self.assertEqual(relay.playbackId, "next-session")
            self.assertFalse(relay.isPlaybackOwner)
            grant = json.loads(self.other.send_text.await_args.args[0])
            self.assertTrue(grant["isPlaybackOwner"])
            self.assertEqual(grant["playbackId"], "next-session")
            await handle_current_media(
                manager=self.manager,
                session=self.session,
                user_id=1,
                sender_websocket=self.other,
                data=data,
            )
            self.send_to_user.assert_awaited_once()

    async def test_stale_seek_and_end_cannot_change_new_interval(self) -> None:
        self.manager.user_playback_states[1].active_interval_start_ms = 0
        old = dict(mediaPublicId="video", queueMediaId=1, playbackId="old")
        with patch(
            "backend.core.framework.websocket.handlers.media_ended.close_listen_interval_async",
            new_callable=AsyncMock,
        ) as close, patch(
            "backend.core.framework.websocket.handlers.seek.Media.get_media_from_public_id_async",
            new_callable=AsyncMock,
        ) as media:
            await handle_media_ended(
                manager=self.manager,
                session=self.session,
                user_id=1,
                sender_websocket=self.owner,
                data=old,
            )
            await handle_seek(
                manager=self.manager,
                session=self.session,
                user_id=1,
                sender_websocket=self.owner,
                data=dict(**old, timeFrom=1800, timeTo=0),
            )
            close.assert_not_awaited()
            media.assert_not_awaited()

    async def test_owner_progress_is_relayed_with_complete_identity(self) -> None:
        module = "backend.core.framework.websocket.handlers.current_time"
        ok = AResult(code=AResultCode.OK, message="OK", result=True)
        with patch(
            f"{module}.User.update_user_current_time", new=AsyncMock(return_value=ok)
        ), patch(
            f"{module}.start_listen_interval_async", new_callable=AsyncMock
        ), patch(
            f"{module}.check_and_record_listen_threshold_async", new_callable=AsyncMock
        ), patch(
            f"{module}.maybe_flush_listen_interval_async", new_callable=AsyncMock
        ):
            await handle_current_time(
                manager=self.manager,
                session=self.session,
                user_id=1,
                sender_websocket=self.owner,
                data=dict(
                    mediaPublicId="song",
                    queueMediaId=2,
                    playbackId="new",
                    currentTimeMs=2000,
                ),
            )
            assert self.send_to_user.await_args is not None
            call = self.send_to_user.await_args.kwargs
            self.assertIs(call["exclude_websocket"], self.owner)
            self.assertEqual(call["message"].mediaPublicId, "song")
            self.assertEqual(call["message"].playbackId, "new")
            self.assertEqual(self.manager.user_playback_states[1].last_time_ms, 2000)

    async def test_remote_seek_preserves_owner_and_relays_once(self) -> None:
        module = "backend.core.framework.websocket.handlers.seek"
        ok = AResult(code=AResultCode.OK, message="OK", result=True)
        media_result = AResult(
            code=AResultCode.OK, message="OK", result=SimpleNamespace(id=5)
        )
        with patch(
            f"{module}.Media.get_media_from_public_id_async",
            new=AsyncMock(return_value=media_result),
        ), patch(
            f"{module}.User.add_user_current_time_seek_async",
            new=AsyncMock(return_value=ok),
        ), patch(
            f"{module}.User.update_user_current_time", new=AsyncMock(return_value=ok)
        ):
            await handle_seek(
                manager=self.manager,
                session=self.session,
                user_id=1,
                sender_websocket=self.other,
                data=dict(
                    mediaPublicId="song",
                    queueMediaId=2,
                    playbackId="new",
                    timeFrom=1,
                    timeTo=30,
                ),
            )
            assert self.send_to_user.await_args is not None
            call = self.send_to_user.await_args.kwargs
            self.assertIs(call["exclude_websocket"], self.other)
            self.assertTrue(call["message"].isSeek)
            self.assertEqual(call["message"].currentTimeMs, 30000)
            self.assertIs(self.manager.playback_owners[1], self.owner)

    async def test_reconnect_snapshot_only_replies_to_requesting_device(self) -> None:
        from backend.core.framework.websocket.handlers.playback_state import (
            handle_playback_state,
        )

        socket = AsyncMock(spec=WebSocket)
        await handle_playback_state(
            manager=self.manager,
            session=self.session,
            user_id=1,
            data={},
            sender_websocket=socket,
        )
        socket.send_text.assert_awaited_once()
        self.assertIn('"playbackId":"new"', socket.send_text.await_args.args[0])
        self.send_to_user.assert_not_awaited()

    async def test_last_accepted_play_request_wins(self) -> None:
        module = "backend.core.framework.websocket.handlers.current_media"
        ok = AResult(code=AResultCode.OK, message="OK", result=True)
        with patch(
            f"{module}.User.update_user_current_media", new=AsyncMock(return_value=ok)
        ), patch(
            f"{module}.User.update_user_current_time", new=AsyncMock(return_value=ok)
        ), patch(
            f"{module}.close_listen_interval_async", new_callable=AsyncMock
        ):
            for socket, playback_id in [
                (self.owner, "device-a"),
                (self.other, "device-b"),
            ]:
                await handle_current_media(
                    manager=self.manager,
                    session=self.session,
                    user_id=1,
                    sender_websocket=socket,
                    data=dict(
                        mediaPublicId="song",
                        queueMediaId=2,
                        playbackId=playback_id,
                        queueType="SORTED",
                        currentTimeMs=5000,
                    ),
                )
            self.assertIs(self.manager.playback_owners[1], self.other)
            self.assertEqual(
                self.manager.user_playback_states[1].playback_id, "device-b"
            )
            assert self.send_to_user.await_args is not None
            last_revoke = self.send_to_user.await_args.kwargs
            self.assertIs(last_revoke["exclude_websocket"], self.other)
            self.assertFalse(last_revoke["message"].isPlaybackOwner)
            grant = json.loads(self.other.send_text.await_args.args[0])
            self.assertTrue(grant["isPlaybackOwner"])
            self.assertEqual(grant["playbackId"], "device-b")


if __name__ == "__main__":
    unittest.main()
