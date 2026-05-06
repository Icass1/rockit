import os
from pathlib import Path
import json
import dotenv

dotenv.load_dotenv()


def main():

    version = input("Enter version: ")

    if len(version.split(".")) != 3:
        print("Invalid version must be in format 0.0.0")

    for a in version.split("."):
        try:
            int(a)
        except:
            print("Must be numbers")
            return

    version_ts = Path("frontend/apps/mobile/constants/version.ts")
    version_ts.write_text(f'export const APP_VERSION = "{version}";\n')

    app_json = Path("frontend/apps/mobile/app.json")

    data = json.loads(app_json.read_text())

    data["expo"]["version"] = version

    app_json.write_text(json.dumps(data, indent=4))

    package_json = Path("frontend/apps/mobile/package.json")
    package_data = json.loads(package_json.read_text())
    package_data["version"] = version
    package_json.write_text(json.dumps(package_data, indent=4))

    build_gradle_path = Path("frontend/apps/mobile/android/app/build.gradle")

    input_content = build_gradle_path.read_text().split("\n")
    output_content: list[str] = []
    for line in input_content:
        if "versionName" in line:
            output_content.append(f'        versionName "{version}"')
        else:
            output_content.append(line)

    build_gradle_path.write_text("\n".join(output_content))

    expo_token = os.environ.get("EXPO_TOKEN")

    os.chdir("frontend/apps/mobile")

    os.system(
        f"EXPO_TOKEN={expo_token} eas build --platform android --clear-cache --profile preview"
    )


if __name__ == "__main__":
    main()
