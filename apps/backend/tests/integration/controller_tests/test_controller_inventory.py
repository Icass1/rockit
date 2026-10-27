"""Keep one direct-call case for every HTTP method on every controller."""

from collections import Counter

from tests.direct_harness import DirectEndpointHarness
from tests.fakes import RecordingSession
from tests.integration.controller_tests.support import app, controller_endpoint_cases


def test_controller_direct_call_cases_cover_every_registered_http_method() -> None:
    """Adding a route automatically adds coverage and changing controller discovery is visible."""
    routes = DirectEndpointHarness(app, RecordingSession()).registered_routes()
    expected = Counter(
        {
            module: sum(
                len(route.methods) for route in routes if route.endpoint.__module__.endswith(module)
            )
            for module in {route.endpoint.__module__.rsplit(".", 1)[-1] for route in routes}
        }
    )
    actual = Counter({module: len(controller_endpoint_cases(module)) for module in expected})

    assert expected == actual
