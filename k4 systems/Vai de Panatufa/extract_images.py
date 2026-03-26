import fitz  # PyMuPDF
import sys

def extract_pdf_images(pdf_path):
    try:
        doc = fitz.open(pdf_path)
        for page_num in range(min(5, len(doc))):  # Extract max 5 pages
            page = doc.load_page(page_num)
            pix = page.get_pixmap(dpi=150)
            img_path = f"page_{page_num + 1}.png"
            pix.save(img_path)
            print(f"Saved {img_path}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    extract_pdf_images(sys.argv[1])
