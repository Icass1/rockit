import json
import unittest

from backend.core.enums.queueTypeEnum import QueueTypeEnum
from backend.core.responses.currentMediaMessage import CurrentMediaMessage


class CurrentMediaMessageTests(unittest.TestCase):
    def test_queue_type_names_survive_websocket_json_round_trip(self) -> None:
        """Both queue modes must serialize as the strings clients validate."""
        for queue_type in QueueTypeEnum:
            for value in (queue_type, queue_type.name):
                with self.subTest(queue_type=queue_type, value=value):
                    message = CurrentMediaMessage(
                        playbackId="playback",
                        mediaPublicId="song",
                        queueMediaId=1,
                        queueType=value,
                    )

                    payload = json.loads(s=message.model_dump_json())

                    self.assertEqual(payload["queueType"], queue_type.name)
                    restored = CurrentMediaMessage.model_validate(obj=payload)
                    self.assertIs(restored.queueType, queue_type)


if __name__ == "__main__":
    unittest.main()
