from PIL import Image
import sys

def remove_bg(input_path, output_path, keep_color='black', threshold=100):
    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()
    
    new_data = []
    for item in datas:
        # item is (R, G, B, A)
        r, g, b, a = item
        
        if keep_color == 'black':
            # If the pixel is dark, keep it
            if r < threshold and g < threshold and b < threshold:
                # To remove anti-aliasing gray edges nicely, we can make it solid black but adjust alpha
                # or just keep the pixel as is
                new_data.append((0, 0, 0, 255))
            else:
                new_data.append((255, 255, 255, 0))
        elif keep_color == 'white':
            # If the pixel is light, keep it
            if r > 255 - threshold and g > 255 - threshold and b > 255 - threshold:
                new_data.append((255, 255, 255, 255))
            else:
                new_data.append((255, 255, 255, 0))
                
    img.putdata(new_data)
    img.save(output_path, "PNG")

if __name__ == '__main__':
    # We will process both images
    print("Processing light theme logo (black crystal)...")
    remove_bg('src/renderer/src/assets/logo-light.png', 'src/renderer/src/assets/logo-light.png', keep_color='black', threshold=100)
    
    print("Processing dark theme logo (white crystal)...")
    # For the white crystal, it was a jpg, so we read it, output as PNG
    remove_bg('src/renderer/src/assets/logo-dark.jpg', 'src/renderer/src/assets/logo-dark.png', keep_color='white', threshold=100)
    print("Done!")
