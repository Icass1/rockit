"""Install a preview APK and verify that its bundled React Native app starts."""

import argparse
import json
from pathlib import Path
import subprocess
import time
import xml.etree.ElementTree as ET


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("apk", type=Path)
    parser.add_argument("--adb", default="adb")
    parser.add_argument("--serial", required=True)
    parser.add_argument("--package", default="com.rockit.mobile.preview")
    parser.add_argument("--output", type=Path, default=Path("android-smoke-test"))
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    adb = [args.adb, "-s", args.serial]

    def run(*command: str, timeout: int = 60, check: bool = True) -> str:
        result = subprocess.run(
            args=adb + list(command),
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
        output = result.stdout + result.stderr
        if check and result.returncode != 0:
            raise RuntimeError(f"adb {' '.join(command)} failed:\n{output}")
        return output

    def save(name: str, content: str) -> None:
        (args.output / name).write_text(data=content, encoding="utf-8")

    def logs() -> str:
        return run(
            "logcat",
            "-d",
            "-v",
            "threadtime",
            "AndroidRuntime:E",
            "ReactNativeJS:V",
            "SoLoader:V",
            "*:S",
            check=False,
        )

    try:
        if not args.apk.is_file():
            raise RuntimeError(f"APK does not exist: {args.apk}")
        if run("shell", "getprop", "sys.boot_completed").strip() != "1":
            raise RuntimeError("The selected Android device has not finished booting")

        # Use a fresh emulator: this clears its logcat, then installs without the
        # file manager's confirmation session or incremental-install transport.
        run("logcat", "-c")
        install = run(
            "install", "--no-incremental", "-r", str(args.apk.resolve()), timeout=180
        )
        save("install.txt", install)
        if "Success" not in install:
            raise RuntimeError(f"APK installation did not succeed:\n{install}")
        run("shell", "am", "force-stop", args.package)
        launch = run(
            "shell",
            "am",
            "start",
            "-W",
            "-n",
            f"{args.package}/com.rockit.mobile.MainActivity",
        )
        save("launch.txt", launch)
        if "Status: ok" not in launch:
            raise RuntimeError(f"Activity did not start:\n{launch}")

        deadline = time.monotonic() + 60
        while time.monotonic() < deadline:
            logcat = logs()
            if "FATAL EXCEPTION" in logcat:
                raise RuntimeError(
                    "Android runtime crashed during startup; see logcat.txt"
                )
            if 'Running "main"' in logcat:
                break
            time.sleep(2)
        else:
            raise RuntimeError(
                "The bundled React Native app did not start within 60 seconds"
            )

        # am start succeeds before Hermes and the JS bundle finish loading.
        # Give delayed startup crashes time to appear, then check both process
        # survival and an actual React Native view (rather than the splash).
        time.sleep(10)
        if "FATAL EXCEPTION" in logs():
            raise RuntimeError("Android runtime crashed after starting React Native")
        if not run("shell", "pidof", args.package, check=False).strip():
            raise RuntimeError("The app process exited after launch")
        activity = run("shell", "dumpsys", "activity", "activities")
        save("activity.txt", activity)
        if not any(
            args.package in line
            and ("mResumedActivity" in line or "topResumedActivity" in line)
            for line in activity.splitlines()
        ):
            raise RuntimeError("The app is no longer the foreground activity")
        run("shell", "uiautomator", "dump", "/sdcard/rockit-smoke-test.xml")
        run(
            "pull",
            "/sdcard/rockit-smoke-test.xml",
            str((args.output / "window.xml").resolve()),
        )
        window = ET.parse(source=args.output / "window.xml")
        # Accessibility exposes RN TextInput as a native EditText, not its
        # Java implementation class. A fresh preview must reach the login form.
        inputs = [
            node
            for node in window.iter("node")
            if node.get("package") == args.package
            and node.get("class") == "android.widget.EditText"
        ]
        if len(inputs) < 2:
            raise RuntimeError("The login form did not render; see window.xml")
        save(
            "result.json",
            json.dumps(obj={"package": args.package, "status": "passed"}, indent=2),
        )
        print(
            "APK installed, bundled JavaScript started, "
            "and React Native rendered a screen."
        )
        return 0
    except (OSError, RuntimeError, subprocess.TimeoutExpired, ET.ParseError) as error:
        save(
            "result.json",
            json.dumps(
                obj={"package": args.package, "status": "failed", "error": str(error)},
                indent=2,
            ),
        )
        print(str(error))
        return 1
    finally:
        try:
            save("logcat.txt", logs())
        except (OSError, subprocess.TimeoutExpired) as error:
            save("logcat.txt", f"Could not collect logcat: {error}")


if __name__ == "__main__":
    raise SystemExit(main())
