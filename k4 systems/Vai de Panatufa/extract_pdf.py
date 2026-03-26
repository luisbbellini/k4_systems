import fitz  # PyMuPDF
import sys
import json

def extract_pdf_data(pdf_path, txt_path):
    try:
        doc = fitz.open(pdf_path)
        text = ""
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text += f"--- Page {page_num + 1} ---\n"
            text += page.get_text("text") + "\n"
        
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"Extraction successful: {txt_path}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python extract_pdf.py <pdf_path> <txt_path>")
    else:
        extract_pdf_data(sys.argv[1], sys.argv[2])
