"""Exercise registered Rockit controllers without HTTP or external services."""

import pytest

from app.main import app
from tests.direct_harness import DirectEndpointHarness
from tests.fakes import RecordingSession
from tests.integration.controller_tests.support import invalid_body_route_cases


@pytest.mark.parametrize(("method", "path", "body"), invalid_body_route_cases())
def test_controllers_validate_payloads_before_database_access(
    method: str, path: str, body: dict[str, object]
) -> None:
    session = RecordingSession()
    response = DirectEndpointHarness(app, session).call(method, path, json=body)
    assert response.status_code == 422, f"{method} {path}: {response.text}"
    assert not session.statements


def test_login_translates_missing_user_into_invalid_credentials() -> None:
    session = RecordingSession()
    response = DirectEndpointHarness(app, session).post(
        "/auth/login",
        json={
            "username": "missing-user",
            "password": "valid-password",
            "platform": "WEB",
            "rememberMe": False,
        },
    )
    assert response.status_code == 400
    assert response.json() == {"detail": "Invalid credentials."}
    assert any('core."user"' in statement for statement in session.statements)
