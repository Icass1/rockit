"""Read Lyricsfile 1.0; invalid word timing degrades to the complete line text."""

from typing import Any, cast

import yaml
from pydantic import BaseModel, Field, ValidationError, model_validator
from yaml.nodes import MappingNode

from core.models.lyrics import DynamicLyrics, Lyrics, LyricsWord
from logger import getLogger

logger = getLogger(__name__)


class LyricsfileLoader(yaml.SafeLoader):
    def compose_node(self, parent: Any, index: Any) -> Any:  # noqa: ANN401
        if cast(Any, self).check_event(yaml.AliasEvent):
            raise ValueError("Lyricsfile aliases are unsupported")
        if len(self.anchors) > 100 or len(self.states) > 30:
            raise ValueError("Lyricsfile nesting limit exceeded")
        return super().compose_node(parent, index)

    def construct_mapping(self, node: MappingNode, deep: bool = False) -> dict[Any, Any]:
        keys: list[Any] = [
            cast(Any, self).construct_object(key, deep=deep) for key, _ in node.value
        ]
        if len(set(keys)) != len(keys):
            raise ValueError("Duplicate Lyricsfile keys")
        return super().construct_mapping(node, deep=deep)


class TimedSegment(BaseModel):
    text: str
    start_ms: int = Field(strict=True, ge=0, le=86400000)
    end_ms: int | None = Field(default=None, strict=True, ge=0, le=86400000)

    @model_validator(mode="after")
    def validate_end(self) -> "TimedSegment":
        if self.end_ms is not None and self.end_ms < self.start_ms:
            raise ValueError("Segment end must follow its start")
        return self


class FileLine(TimedSegment):
    words: object = None


class Lyricsfile(BaseModel):
    version: str
    plain: str | None = None
    lines: list[object] = Field(default_factory=list[object], max_length=1000)


def parse_lyricsfile(raw: str | None) -> tuple[list[Lyrics] | None, list[DynamicLyrics]]:
    if not raw:
        return None, []
    try:
        if len(raw) > 1_000_000:
            raise ValueError("Lyricsfile size limit exceeded")
        document = Lyricsfile.model_validate(yaml.load(raw, Loader=LyricsfileLoader))
        if document.version != "1.0":
            raise ValueError("Unsupported Lyricsfile version")
    except (yaml.YAMLError, ValueError, TypeError, RecursionError) as exc:
        logger.warning("Ignoring invalid Lyricsfile: %s", exc)
        return None, []

    lines: list[DynamicLyrics] = []
    for value in document.lines:
        try:
            line = FileLine.model_validate(value)
        except ValidationError:
            logger.warning("Ignoring invalid Lyricsfile line")
            continue
        words: list[LyricsWord] = []
        word_values: object = line.words
        if word_values:
            try:
                if not isinstance(word_values, list) or len(cast(list[object], word_values)) > 2000:
                    raise ValueError("Invalid word list")
                segments = [
                    TimedSegment.model_validate(word) for word in cast(list[object], word_values)
                ]
                if "".join(word.text for word in segments) != line.text:
                    raise ValueError("Words do not reconstruct line")
                if any(
                    word.start_ms < line.start_ms
                    or (line.end_ms is not None and (word.end_ms or word.start_ms) > line.end_ms)
                    for word in segments
                ):
                    raise ValueError("Words fall outside line")
                if [word.start_ms for word in segments] != sorted(
                    word.start_ms for word in segments
                ):
                    raise ValueError("Word timestamps must be ordered")
                words = [
                    LyricsWord(
                        text=word.text,
                        timestamp_s=word.start_ms / 1000,
                        end_timestamp_s=word.end_ms / 1000 if word.end_ms is not None else None,
                    )
                    for word in segments
                ]
            except (ValueError, TypeError):
                logger.warning("Ignoring invalid Lyricsfile word timings")
        lines.append(
            DynamicLyrics(
                text=line.text,
                timestamp_s=line.start_ms / 1000,
                end_timestamp_s=line.end_ms / 1000 if line.end_ms is not None else None,
                words=words,
            )
        )
    lines.sort(key=lambda line: line.timestamp_s)
    plain = [Lyrics(text=line) for line in document.plain.split("\n")] if document.plain else None
    if not any(line.text.strip() for line in lines):
        lines = []
    if plain and not any(line.text.strip() for line in plain):
        plain = None
    return plain, lines
