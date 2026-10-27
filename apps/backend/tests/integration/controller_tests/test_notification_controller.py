"""Template notification contracts and account isolation, without external services."""

from types import SimpleNamespace

from app.main import app
from tests.direct_harness import DirectEndpointHarness
from tests.fakes import RecordingSession


def test_history_uses_server_pagination_and_authenticated_owner() -> None:
    session = RecordingSession(results=[[(9, 4)], []])
    harness = DirectEndpointHarness(app, session)
    response = harness.get("/notifications?limit=2&offset=2&unread_only=true")
    assert response.status_code == 200
    assert response.json() == {"items": [], "unreadCount": 4, "totalCount": 4}
    assert session.parameters[0]["user_id_1"] == harness.user.id
    assert session.parameters[1]["user_id_1"] == harness.user.id
    assert "read_at IS NULL" in session.statements[1]
    assert "LIMIT" in session.statements[1] and "OFFSET" in session.statements[1]


def test_read_and_destination_never_expose_another_accounts_notification() -> None:
    for method, suffix in [("PATCH", "read"), ("GET", "destination")]:
        session = RecordingSession()
        harness = DirectEndpointHarness(app, session)
        response = harness.call(method, f"/notifications/foreign-id/{suffix}")
        assert response.status_code == 404
        assert session.parameters[0]["user_id_1"] == harness.user.id
        assert session.parameters[0]["public_id_1"] == "foreign-id"


def test_notification_routes_require_authentication() -> None:
    harness = DirectEndpointHarness(app, RecordingSession())
    harness.user = None
    assert harness.get("/notifications").status_code == 401
    assert harness.call("PATCH", "/notifications/id/read").status_code == 401


def test_admin_subscription_routes_are_removed() -> None:
    harness = DirectEndpointHarness(app, RecordingSession())
    harness.user = SimpleNamespace(id=7, admin=False)
    for path in ["/users", "/users/notification-events", "/users/other/notification-subscriptions"]:
        assert harness.get(path).status_code == 404
    assert (
        harness.call(
            "PATCH", "/users/other/notification-subscriptions", json={"eventKeys": []}
        ).status_code
        == 404
    )


def test_user_can_inspect_registered_personal_events() -> None:
    response = DirectEndpointHarness(app, RecordingSession()).get("/user/notification-events")
    assert response.status_code == 200
    assert {event["key"] for event in response.json()} >= {
        "APPLICATION_MESSAGE",
        "DOWNLOAD_COMPLETED",
        "FRIEND_REQUEST",
    }


def test_unknown_subscription_events_are_rejected_before_database_access() -> None:
    session = RecordingSession()
    response = DirectEndpointHarness(app, session).call(
        "PATCH", "/user/notification-subscriptions", json={"eventKeys": ["UNKNOWN"]}
    )
    assert response.status_code == 422
    assert not session.statements
