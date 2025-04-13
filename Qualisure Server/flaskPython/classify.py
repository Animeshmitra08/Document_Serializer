from transformers import pipeline
from pdfminer.high_level import extract_text
import sys
import json

classifier = pipeline("zero-shot-classification", model="typeform/distilbert-base-uncased-mnli")
labels = ["Education", "Work", "Health", "Finance", "Travel", "Legal"]

def classify_document(pdf_path):
    try:
        text = extract_text(pdf_path)[:1000]

        if not text.strip():
            print(json.dumps({"error": "No text found in PDF"}))
            return

        result = classifier(text, candidate_labels=labels)

        output = {
            "category": result["labels"][0],
            "confidence": float(result["scores"][0])
        }
        print(json.dumps(output))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing PDF file argument"}))
    else:
        classify_document(sys.argv[1])
