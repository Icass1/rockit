"""Generated response validators retain list element models."""

from pydantic import BaseModel

from core.utils.httpMethodsGenerator import format_route_path, response_schema


class Station(BaseModel):
    name: str


def test_list_responses_validate_every_item() -> None:
    assert response_schema(Station) == "dto.StationSchema"
    assert response_schema(list[Station]) == "dto.StationSchema.array()"


def test_path_converter_parameters_are_interpolated_and_encoded() -> None:
    assert format_route_path("/storage-object/by-key/{key:path}", "key") == (
        "/storage-object/by-key/${encodeURIComponent(key)}"
    )
    assert format_route_path("/media/{public_id}", "public_id") == (
        "/media/${encodeURIComponent(publicId)}"
    )
