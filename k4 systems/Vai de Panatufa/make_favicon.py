from PIL import Image

def create_favicon(input_path, output_path):
    # Open the first page which contains the logo in the center
    img = Image.open(input_path)
    
    # The logo is roughly in the center of page 1.
    width, height = img.size
    
    # We estimate the bounding box of the logo. Let's crop the center area.
    # The image is 1600x900 or similar (16:9). Logo is center-ish.
    left = width * 0.35
    top = height * 0.25
    right = width * 0.65
    bottom = height * 0.65
    
    logo = img.crop((left, top, right, bottom))
    
    # Resize to something square-ish if needed or just save
    logo.thumbnail((256, 256))
    logo.save(output_path, format="PNG")
    print("Favicon created!")

if __name__ == "__main__":
    create_favicon("page_1.png", "favicon.png")
