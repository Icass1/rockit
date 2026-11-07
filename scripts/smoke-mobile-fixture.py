"""Verify an installed preview against the local generated-contract fixture."""

import argparse
import json
import re
import subprocess
import sys
import time
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("apk", type=Path)
    parser.add_argument("--serial", required=True)
    parser.add_argument("--package", default="com.rockit.mobile.preview")
    parser.add_argument("--output", type=Path, default=Path(".test-build/frontend/android"))
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    adb = ["adb", "-s", args.serial]
    steps = []
    started = time.monotonic()

    def run(*command: str) -> str:
        return subprocess.check_output(args=adb + list(command), text=True, timeout=60)

    def window() -> ET.Element:
        run("shell", "uiautomator", "dump", "/sdcard/rockit-fixture.xml")
        content = run("shell", "cat", "/sdcard/rockit-fixture.xml")
        (args.output / "window.xml").write_text(data=content, encoding="utf-8")
        return ET.fromstring(text=content)

    def find(label: str, *, edit: bool = False) -> ET.Element:
        deadline = time.monotonic() + 30
        while time.monotonic() < deadline:
            for node in window().iter("node"):
                if (edit and node.get("class") == "android.widget.EditText") or (
                    not edit
                    and (
                        node.get("resource-id", "").endswith(label)
                        or node.get("content-desc") == label
                        or node.get("text") == label
                    )
                ):
                    return node
            time.sleep(1)
        raise RuntimeError(f"Expected native control did not appear: {label}")

    def tap(node: ET.Element) -> None:
        numbers = [
            int(value) for value in re.findall(pattern=r"\d+", string=node.get("bounds", ""))
        ]
        if len(numbers) != 4:
            raise RuntimeError("Control has no usable screen bounds")
        run(
            "shell",
            "input",
            "tap",
            str((numbers[0] + numbers[2]) // 2),
            str((numbers[1] + numbers[3]) // 2),
        )

    def record(name: str) -> None:
        steps.append({"step": name, "elapsedMs": round((time.monotonic() - started) * 1000)})

    def fixture() -> dict:
        with urllib.request.urlopen(
            url="http://127.0.0.1:18899/__fixture/calls", timeout=10
        ) as response:
            return json.load(fp=response)

    try:
        # Only the emulator port is forwarded; production manifests and URLs stay unchanged.
        run("reverse", "tcp:18899", "tcp:18899")
        subprocess.run(
            args=[
                sys.executable,
                "apps/mobile/scripts/smoke-test-android.py",
                str(args.apk),
                "--serial",
                args.serial,
                "--package",
                args.package,
                "--output",
                str(args.output / "startup"),
            ],
            check=True,
        )
        record("installation-and-native-startup")
        tap(find("login-username"))
        run("shell", "input", "text", "fixture")
        tap(find("login-password"))
        run("shell", "input", "text", "fixture-password")
        run("shell", "input", "keyevent", "4")
        tap(find("login-submit"))
        tap(find("navigation-library"))
        record("authenticated-native-session")
        tap(find("library-search", edit=True))
        run("shell", "input", "text", "Playlist%sexclusive")
        run("shell", "input", "keyevent", "4")
        tap(find("Playlist exclusive"))
        find("Pause")
        deadline = time.monotonic() + 10
        while time.monotonic() < deadline:
            data = fixture()
            selections = [
                message for message in data["messages"] if message.get("type") == "current_queue"
            ]
            if (
                selections
                and len(selections[-1]["queue"]) == 1
                and selections[-1]["queue"][0]["mediaPublicId"] == "song-2"
            ):
                break
            time.sleep(0.5)
        else:
            raise RuntimeError("Native play did not select exactly the playlist-only song")
        logins = [call for call in data["calls"] if call["path"] == "/auth/login"]
        if not logins or logins[-1]["body"]["platform"] != "MOBILE":
            raise RuntimeError("APK used the browser authentication policy")
        record("playlist-only-search-and-single-song-play")
        run("shell", "input", "keyevent", "3")
        time.sleep(2)
        media_session = run("shell", "dumpsys", "media_session")
        (args.output / "media-session.txt").write_text(data=media_session, encoding="utf-8")
        if args.package not in media_session or "state=3" not in media_session:
            raise RuntimeError("Native MediaSession did not remain playing in the background")
        record("background-native-media-session")
        data = fixture()
        if data["unhandled"] or data["protocolErrors"]:
            raise RuntimeError(
                "The fixture received unimplemented endpoints or invalid socket messages"
            )
        (args.output / "requests.json").write_text(
            data=json.dumps(obj=data, indent=2), encoding="utf-8"
        )
        (args.output / "result.json").write_text(
            data=json.dumps(obj={"status": "passed", "steps": steps}, indent=2), encoding="utf-8"
        )
        return 0
    except (OSError, RuntimeError, subprocess.SubprocessError, ET.ParseError) as error:
        (args.output / "result.json").write_text(
            data=json.dumps(
                obj={"status": "failed", "error": str(error), "steps": steps}, indent=2
            ),
            encoding="utf-8",
        )
        print(str(error))
        return 1
    finally:
        try:
            (args.output / "logcat.txt").write_text(
                data=run("logcat", "-d", "-t", "1000"), encoding="utf-8"
            )
        except (OSError, subprocess.SubprocessError):
            pass


if __name__ == "__main__":
    raise SystemExit(main())
