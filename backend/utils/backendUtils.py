from spotdl.utils.formatter import create_file_name
from PIL import Image, ImageDraw, ImageFilter
from spotdl.utils.static import BAD_CHARS
from datetime import UTC, datetime
from collections import Counter
from functools import wraps
from typing import List
from io import BytesIO
import requests
import numpy
import math
import cv2
import re

from backend.constants import DOWNLOADER_OPTIONS
from backend.utils.logger import getLogger

if __name__ != "__main__":
    logger = getLogger(__name__)

import random


def time_it(func):
    import time

    logger = getLogger(__name__)

    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        logger.info(
            f'Time taken by {func.__name__} is {round(time.time()-start, 3)}s')

        return result
    return wrapper


def get_utc_date():
    return datetime.now(UTC).strftime('%Y-%m-%d %H:%M:%S')


def get_output_file(song):
    return str(create_file_name(
        song=song,
        template=DOWNLOADER_OPTIONS["output"],
        file_extension=DOWNLOADER_OPTIONS["format"],
        restrict=DOWNLOADER_OPTIONS["restrict"],
        file_name_length=DOWNLOADER_OPTIONS["max_filename_length"],
    ))


def get_song_name(song):
    return "".join(
        char
        for char in song.display_name
        if char not in [chr(i) for i in BAD_CHARS]
    )


def create_id(length=16):

    alphabet = [
        'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
        'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
        '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'
    ]

    random.shuffle(alphabet)
    return "".join(alphabet[0:length])


def sanitize_folder_name(name: str, max_length: int = 255) -> str:
    # Replace any invalid characters with underscores
    # On Windows, the following characters are invalid in folder names: <>:"/\\|?*
    sanitized_name = re.sub(r'[<>:"/\\|?*]', '_', name)

    # Remove any leading/trailing whitespace
    sanitized_name = sanitized_name.strip()

    # Optionally truncate to the max length (default is 255, a common filesystem limit)
    if len(sanitized_name) > max_length:
        sanitized_name = sanitized_name[:max_length]

    return sanitized_name


def download_image(url: str, path: str):
    try:
        # Send a GET request to the URL
        response = requests.get(url, stream=True)
        response.raise_for_status()  # Check for HTTP request errors

        # Open the file in binary write mode and save the content
        with open(path, 'wb') as file:
            # Download in chunks of 1KB
            for chunk in response.iter_content(1024):
                file.write(chunk)
        logger.debug(f"Image {url} successfully downloaded to {path}")
    except requests.exceptions.RequestException as e:
        logger.error(f"An error occurred: {e}")


def get_transfromed_image(image: Image.Image, base_1, base_2):

    image = image.convert("RGBA").resize((640, 640))
    blur_radius = 0
    border_radius = 30
    offset = 0
    back_color = Image.new(image.mode, image.size, (0, 0, 0, 0))
    offset = blur_radius * 2 + offset
    mask = Image.new("L", image.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle(
        (offset, offset, image.size[0] - offset, image.size[1] - offset), border_radius,  fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(blur_radius))

    image = Image.composite(image, back_color, mask)

    image_np = numpy.array(image)

    translate_1 = numpy.matrix([
        [1, 0, -320],
        [0, 1, -320],
        [0, 0, 1]
    ])

    shear = numpy.matrix([
        [base_1[0], -base_2[0], 0],
        [-base_1[1], base_2[1], 0],
        [0, 0, 1]
    ])

    translate_2 = numpy.matrix([
        [1, 0, 320],
        [0, 1, 320],
        [0, 0, 1]
    ])

    transform_matrix = translate_2*shear*translate_1

    # Apply the affine transformation using OpenCV
    transformed_image_np = cv2.warpAffine(
        image_np,
        transform_matrix[:2, :],
        (image_np.shape[1], image_np.shape[0]),
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(0, 0, 0, 0),
    )

    # Convert back to a Pillow image
    transformed_image_cv2 = Image.fromarray(transformed_image_np)

    return transformed_image_cv2


@time_it
def create_playlist_collage(output_path, urls: List[str] = []):

    # https://www.desmos.com/calculator/pao5byd69d?lang=es

    out = Image.new("RGBA", (640, 640), (0, 0, 0, 0))  # (26, 26, 26, 255)

    base_1: tuple[float, float] = (0.68, 0.05)
    base_2: tuple[float, float] = (-0.2, 0.65)

    gap = 20

    abs_base_1: float = math.sqrt(base_1[0]**2 + base_1[1]**2)
    abs_base_2: float = math.sqrt(base_2[0]**2 + base_2[1]**2)

    x_space: float = (gap + 640*abs_base_2) / \
        (math.sqrt(1 + (base_2[1]/base_2[0])**2))
    y_space: float = -base_2[1]/base_2[0]*x_space

    d: float = (640*abs_base_1 + gap)/abs_base_1

    column_x_space: float = base_1[0]*d - base_2[0]*640*abs_base_2/2 + gap/2
    column_y_space: float = base_1[1]*d - base_2[1]*640*abs_base_2/2 + gap/2

    url_counts = Counter(urls)
    sorted_urls: List[str] = [url for url, _ in url_counts.most_common(7)]
    target_indices: List[int] = [1, 0, 2, 5, 4, 3, 6]

    indexed_images: List[tuple[int, Image.Image]] = []

    for i, url in enumerate(sorted_urls):
        if i >= 7:
            break

        response = requests.get(url)
        try:
            image = Image.open(BytesIO(response.content))
            indexed_images.append((target_indices[i], image))
        except:
            print(url, response.content)

    # Sort the images by their intended indices and extract them
    indexed_images.sort(key=lambda x: x[0])
    images: List[Image.Image] = [img for _, img in indexed_images]

    # images.append( Image.new("RGB", (10, 10), "blue"))
    # images.append( Image.new("RGB", (10, 10), "red"))
    # images.append( Image.new("RGB", (10, 10), "green"))
    # images.append( Image.new("RGB", (10, 10), "black"))
    # images.append( Image.new("RGB", (10, 10), "white"))
    # images.append( Image.new("RGB", (10, 10), "orange"))
    # images.append( Image.new("RGB", (10, 10), "yellow"))

    index = 0
    while len(images) < 7:
        images.append(images[index])
        index += 1

    # random.shuffle(x=images)

    for k in range(3):
        image = get_transfromed_image(images[k], base_1=base_1, base_2=base_2)
        k -= 1
        out.paste(image, (int(x_space*k), int(y_space*k)), image)

    for k in range(3, 5):
        image = get_transfromed_image(images[k], base_1=base_1, base_2=base_2)
        k -= 3
        out.paste(image, (int(x_space*k-column_x_space),
                  int(y_space*k + column_y_space)), image)

    for k in range(5, 7):
        image = get_transfromed_image(images[k], base_1=base_1, base_2=base_2)
        k -= 6
        out.paste(image, (int(x_space*k + column_x_space),
                  int(y_space*k - column_y_space)), image)

    out.save(output_path)


if __name__ == "__main__":

    print("2025-04-30T09:12:15.024Z")
    print(get_utc_date())

    # exit()

    create_playlist_collage(output_path="backend/temp/test.png", urls=[
        # "http://localhost:4321/api/image/630242b7f511492720b85cbab809b03c9c5d1d72",
        # "http://localhost:4321/api/image/85530b18c84d2f112d9a7db27bec795d850c01ba",
        # "https://music.rockhosting.org/_next/image?url=https%3A%2F%2Fapi.music.rockhosting.org%2Fapi%2Flist%2Fimage%2FV0XHQF4ASvt7Yf2y_300x300&w=384&q=75",
        "https://i.scdn.co/image/ab67616d0000b2735405ef9e393f5f1e53b4b42e",
        "https://i.scdn.co/image/ab67616d0000b273093c6e7d6069b3c958071f73",
        "https://i.scdn.co/image/ab67616d0000b2736ca5c90113b30c3c43ffb8f4",
        "https://i.scdn.co/image/ab67616d0000b273eec04d194051bbdb926922b0",
        "https://i.scdn.co/image/ab67616d0000b273726d48d93d02e1271774f023",
        "https://i.scdn.co/image/ab67616d0000b27351c02a77d09dfcd53c8676d0",
        "https://i.scdn.co/image/ab67616d0000b2738399047ff71200928f5b6508",
    ])
