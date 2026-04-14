from typing import cast, List
import os

from PIL import Image
from PIL.ImageFile import ImageFile

THRESHOLD = 20


def main(path: str):
    print(path)
    image: ImageFile = Image.open(path)
    print(image.size)

    real_left_margin_width = int((image.size[0] - image.size[1]) / 2)
    lookup_left_margin_width = int((image.size[0] - image.size[1]) / 2) - 10
    print(real_left_margin_width, lookup_left_margin_width)

    pixel = image.getpixel((0, 0))

    print(pixel)

    reds: List[int] = []
    greens: List[int] = []
    blues: List[int] = []

    for x in range(lookup_left_margin_width):
        for y in range(image.size[1]):
            pixel = image.getpixel((x, y))

            if type(pixel) != tuple:
                continue

            pixel = cast(tuple[int, int, int], pixel)

            if pixel[0] not in reds:
                reds.append(pixel[0])
            if pixel[1] not in greens:
                greens.append(pixel[1])
            if pixel[2] not in blues:
                blues.append(pixel[2])

            # print(x, y, pixel)

    print(len(reds), reds)
    print(len(greens), greens)
    print(len(blues), blues)

    if len(reds) < THRESHOLD and len(greens) < THRESHOLD and len(blues) < THRESHOLD:
        print("Border detected")
        resized_image = image.crop(
            (
                real_left_margin_width,
                0,
                image.size[0] - real_left_margin_width,
                image.size[1],
            )
        )
        resized_image.save(path.replace(".jpg", ".png"))
    else:
        print("No border detected")


if __name__ == "__main__":
    for image in os.listdir("images/youtubeMusic"):
        main(path="images/youtubeMusic/" + image)
