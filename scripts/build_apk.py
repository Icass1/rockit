import os
import json
from pathlib import Path
import subprocess

import dotenv

dotenv.load_dotenv()


def main():
    project_root = Path(__file__).resolve().parent.parent
    mobile_root = project_root / "frontend/apps/mobile"

    current_version = json.loads((mobile_root / "app.json").read_text())[
        "expo"
    ]["version"]
    print(f"Current version: {current_version}")

    version = input("Enter version: ")

    if len(version.split(".")) != 3:
        print("Invalid version must be in format 0.0.0")
        return

    for a in version.split("."):
        try:
            int(a)
        except ValueError:
            print("Must be numbers")
            return

    version_ts = mobile_root / "constants/version.ts"
    version_ts.write_text(f'export const APP_VERSION = "{version}";\n')

    app_json = mobile_root / "app.json"

    data = json.loads(app_json.read_text())

    data["expo"]["version"] = version

    app_json.write_text(json.dumps(data, indent=4))

    package_json = mobile_root / "package.json"
    package_data = json.loads(package_json.read_text())
    package_data["version"] = version
    package_json.write_text(json.dumps(package_data, indent=4))

    build_gradle_path = mobile_root / "android/app/build.gradle"

    input_content = build_gradle_path.read_text().split("\n")
    output_content: list[str] = []
    for line in input_content:
        if "versionName" in line:
            output_content.append(f'        versionName "{version}"')
        else:
            output_content.append(line)

    build_gradle_path.write_text("\n".join(output_content))

    gradle_properties_path = mobile_root / "android/gradle.properties"
    gradle_properties = gradle_properties_path.read_text()
    hermes_disabled_properties = gradle_properties.replace(
        "hermesEnabled=true", "hermesEnabled=false", 1
    )

    if gradle_properties == hermes_disabled_properties:
        print("Could not find hermesEnabled=true in android/gradle.properties")
        return

    # The EAS Linux worker currently fails while starting RN's hermesc binary.
    # Use JSC for this APK build, then leave the checked-out project unchanged.
    gradle_properties_path.write_text(hermes_disabled_properties)

    build_environment = os.environ.copy()
    build_environment["NODE_ENV"] = "production"

    try:
        result = subprocess.run(
            [
                "eas",
                "build",
                "--platform",
                "android",
                "--clear-cache",
                "--profile",
                "preview",
            ],
            cwd=mobile_root,
            env=build_environment,
            check=False,
        )
    finally:
        gradle_properties_path.write_text(gradle_properties)

    raise SystemExit(result.returncode)


if __name__ == "__main__":
    main()
