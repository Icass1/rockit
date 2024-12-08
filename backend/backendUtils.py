from spotdl.utils.static import BAD_CHARS
from constants import DOWNLOADER_OPTIONS
from spotdl.utils.formatter import create_file_name
import re
import requests
from logger import getLogger
from typing import List
import numpy
from io import BytesIO

from PIL import Image, ImageTransform, ImageDraw, ImageFilter

if __name__ != "__main__":
    logger = getLogger(__name__)

import random

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

def download_image(url, path):
    try:
        # Send a GET request to the URL
        response = requests.get(url, stream=True)
        response.raise_for_status()  # Check for HTTP request errors

        # Open the file in binary write mode and save the content
        with open(path, 'wb') as file:
            for chunk in response.iter_content(1024):  # Download in chunks of 1KB
                file.write(chunk)
        logger.debug(f"Image {url} successfully downloaded to {path}")
    except requests.exceptions.RequestException as e:
        logger.error(f"An error occurred: {e}")

def get_transfromed_image(image: Image.Image): 

    image = image.convert("RGBA").resize((640, 640))
    blur_radius = 0
    border_radius = 30
    offset = 0
    back_color = Image.new(image.mode, image.size, (0, 0, 0, 0))
    offset = blur_radius * 2 + offset
    mask = Image.new("L", image.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((offset, offset, image.size[0] - offset, image.size[1] - offset), border_radius,  fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(blur_radius))

    image = Image.composite(image, back_color, mask)

    shear = numpy.matrix([
        [1, -2, 0], 
        [0.5, 1, 0],
        [0, 0 ,1]
    ])
    translate = numpy.matrix([
        [1, 0, -50], 
        [0, 1, -300],
        [0, 0, 1]
    ])

    scale = numpy.matrix([
        [1.3, 0, 0], 
        [0, 2.3, 0],
        [0, 0, 1]
    ])

    transform = scale*shear*translate
    # transform = shear*scale*translate

    transform = ImageTransform.AffineTransform([
        transform.item(0, 0), transform.item(0, 1), transform.item(0, 2),
        transform.item(1, 0), transform.item(1, 1), transform.item(1, 2)
    ])
    
    return transform.transform((640, 640), image, fillcolor = (0, 0, 0, 0))

def create_playlist_collage(output_path, urls: List[str]=[], paths: List[str]=[]):
    
    out = Image.new("RGBA", (640, 640), (0, 0, 0, 0)) #(26, 26, 26, 255)

    x_space = 300
    y_spcae = 0.5*x_space
    column_x_space = 70
    column_y_space = 230

    images = []

    for k in paths:
        images.append(Image.open(k, mode="r"))

    for k in urls:
        response = requests.get(k)
        images.append(Image.open(BytesIO(response.content)))

    index = 0
    while len(images) < 12:
        images.append(images[index])
        index += 1

    random.shuffle(images)


    for k in range(3):
        # image = Image.open(paths[k], mode="r")
        image = get_transfromed_image(images[k])
        k -= 1
        out.paste(image, (x_space*k, int(y_spcae*k)), image)

    for k in range(3, 6):
        # image = Image.open(paths[k], mode="r")
        image = get_transfromed_image(images[k])
        k -= 4
        out.paste(image, (x_space*k-column_x_space, int(y_spcae*k) + column_y_space), image)

    for k in range(6, 9):
        # image  = Image.open(paths[k], mode="r")
        image = get_transfromed_image(images[k])
        k -= 7
        out.paste(image, (x_space*k + column_x_space, int(y_spcae*k) - column_y_space), image)

    # image  = Image.open(paths[9], mode="r")
    image = get_transfromed_image(images[9])
    k = 1
    out.paste(image, (x_space*k + column_x_space*2, int(y_spcae*k) - column_y_space*2), image)

    # image  = Image.open(paths[10], mode="r")
    image = get_transfromed_image(images[10])
    k = -1
    out.paste(image, (x_space*k - column_x_space*2, int(y_spcae*k) + column_y_space*2), image)

    # image  = Image.open(paths[11], mode="r")
    image = get_transfromed_image(images[11])
    k = 0
    out.paste(image, (x_space*k - column_x_space*2, int(y_spcae*k) + column_y_space*2), image)

    out.save(output_path)


if __name__ == "__main__":
    create_playlist_collage(output_path="test.png", urls=[
            "http://localhost:4321/api/image/630242b7f511492720b85cbab809b03c9c5d1d72",
            "http://localhost:4321/api/image/85530b18c84d2f112d9a7db27bec795d850c01ba",
            "https://i.scdn.co/image/ab67616d0000b2735405ef9e393f5f1e53b4b42e",
            "https://i.scdn.co/image/ab67616d0000b273093c6e7d6069b3c958071f73",
            "https://i.scdn.co/image/ab67616d0000b2736ca5c90113b30c3c43ffb8f4",
            "https://i.scdn.co/image/ab67616d0000b273eec04d194051bbdb926922b0",
            "https://music.rockhosting.org/_next/image?url=https%3A%2F%2Fapi.music.rockhosting.org%2Fapi%2Flist%2Fimage%2FV0XHQF4ASvt7Yf2y_300x300&w=384&q=75",
        ], paths=[
            "/home/icass/rockit/images/album/AC_DC/The Razors Edge/image.png",
            "/home/icass/rockit/images/album/AC_DC/Highway to Hell/image.png",
            "/home/icass/rockit/images/album/Eminem/Encore (Deluxe Version)/image.png",
            "/home/icass/rockit/images/album/AC_DC/Back In Black/image.png",
            "/home/icass/rockit/images/album/AC_DC/High Voltage/image.png",
            "/home/icass/rockit/images/album/AC_DC/For Those About to Rock (We Salute You)/image.png",
        ]
    )
