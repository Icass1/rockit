from spotdl.utils.static import BAD_CHARS
from constants import DOWNLOADER_OPTIONS
from spotdl.utils.formatter import create_file_name
import re
import requests
from logger import getLogger
from typing import List
import numpy
from io import BytesIO
import cv2
import math

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

def get_transfromed_image(image: Image.Image, base_1, base_2): 

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

    image_np = numpy.array(image)
 
    translate_1 =  numpy.matrix([
        [1, 0, -320], 
        [0, 1, -320],
        [0, 0, 1]
    ])

    shear = numpy.matrix([
        [base_1[0], -base_2[0], 0], 
        [-base_1[1], base_2[1], 0],
        [0, 0, 1]
    ])

    translate_2 =  numpy.matrix([
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

def create_playlist_collage(output_path, urls: List[str]=[], paths: List[str]=[]):
    
    # https://www.desmos.com/calculator/pao5byd69d?lang=es

    out = Image.new("RGBA", (640, 640), (0, 0, 0, 0)) #(26, 26, 26, 255)

    base_1 = (0.68, 0.05)
    base_2 = (-0.2, 0.65)

    gap  = 20

    abs_base_1 = math.sqrt(base_1[0]**2 + base_1[1]**2)
    abs_base_2 = math.sqrt(base_2[0]**2 + base_2[1]**2)

    x_space = (gap + 640*abs_base_2)/(math.sqrt(1 + (base_2[1]/base_2[0])**2))
    y_space = -base_2[1]/base_2[0]*x_space

    d = (640*abs_base_1 + gap)/abs_base_1

    column_x_space = base_1[0]*d - base_2[0]*640*abs_base_2/2 + gap/2
    column_y_space = base_1[1]*d - base_2[1]*640*abs_base_2/2 + gap/2

    images = []

    for k in paths:
        images.append(Image.open(k, mode="r"))

    for k in urls:
        response = requests.get(k)
        try: 
            images.append(Image.open(BytesIO(response.content)))
        except:
            print(k, response.content)
    index = 0
    while len(images) < 7:
        images.append(images[index])
        index += 1

    random.shuffle(images)

    for k in range(3):
        image = get_transfromed_image(images[k], base_1=base_1, base_2=base_2)
        k -= 1
        out.paste(image, (int(x_space*k), int(y_space*k)), image)

    for k in range(3, 5):
        image = get_transfromed_image(images[k], base_1=base_1, base_2=base_2)
        k -= 3
        out.paste(image, (int(x_space*k-column_x_space), int(y_space*k + column_y_space)), image)

    for k in range(5, 7):
        image = get_transfromed_image(images[k], base_1=base_1, base_2=base_2)
        k -= 6
        out.paste(image, (int(x_space*k + column_x_space), int(y_space*k - column_y_space)), image)

    # image = get_transfromed_image(images[9])
    # k = 1
    # out.paste(image, (x_space*k + column_x_space*2, int(y_space*k) - column_y_space*2), image)

    # image = get_transfromed_image(images[9], base_1=base_1, base_2=base_2)
    # k = -1
    # out.paste(image, (x_space*k - column_x_space*2, int(y_space*k) + column_y_space*2), image)

    # image = get_transfromed_image(images[10])
    # k = 0
    # out.paste(image, (x_space*k - column_x_space*2, int(y_space*k) + column_y_space*2), image)

    out.save(output_path)


if __name__ == "__main__":
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
        ], paths=[
            # "/home/icass/rockit/images/album/AC_DC/The Razors Edge/image.png",
            # "/home/icass/rockit/images/album/AC_DC/Highway to Hell/image.png",
            # "/home/icass/rockit/images/album/Eminem/Encore (Deluxe Version)/image.png",
            # "/home/icass/rockit/images/album/AC_DC/Back In Black/image.png",
            # "/home/icass/rockit/images/album/AC_DC/High Voltage/image.png",
            # "/home/icass/rockit/images/album/AC_DC/For Those About to Rock (We Salute You)/image.png",
        ]
    )
