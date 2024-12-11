from PIL import Image, ImageFilter

def apply_radial_focus_blur(image_path, output_path, focus_radius=200, blur_radius=30):
    # Open the input image
    img = Image.open(image_path).convert("RGBA")
    width, height = img.size

    # Create a radial gradient mask
    mask = Image.new("L", (width, height), 0)
    center_x, center_y = width // 2, height // 2
    for y in range(height):
        for x in range(width):
            distance = ((x - center_x) ** 2 + (y - center_y) ** 2) ** 0.5
            mask.putpixel((x, y), max(0, min(255, int(255 - (distance / focus_radius) * 255))))

    # Apply blur to the image
    blurred_img = img.filter(ImageFilter.GaussianBlur(blur_radius))

    # Composite the focused and blurred images
    final_image = Image.composite(img, blurred_img, mask)
    final_image.save(output_path, format="PNG")


# Rutas de entrada y salida
input_image = "backend/temp/test.png"
output_image = "backend/temp/resultado_con_degradado.png"

apply_radial_focus_blur(input_image, output_image, focus_radius=375, blur_radius=5)