import sys
import torch
import json
from transformers import AutoModelForSequenceClassification, AutoTokenizer

# Define labels based on KoalaAI/Text-Moderation model
TARGET_LABELS = ["H", "HR", "V", "OK", "H2", "V2", "S", "SH", "S3"]

# Load the Hugging Face model and tokenizer
MODEL_NAME = "KoalaAI/Text-Moderation"

try:
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
    model.eval()  # Set model to evaluation mode
except Exception as e:
    print(json.dumps({"error": f"Error loading model: {str(e)}"}))
    sys.exit(1)

def analyze_text(text):
    """Analyze text using the Hugging Face model."""
    try:
        # Tokenize input text
        inputs = tokenizer(text, padding="max_length", truncation=True, max_length=128, return_tensors="pt")

        # Perform inference
        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits

        # Apply sigmoid for multi-label classification
        # probabilities = torch.sigmoid(logits).cpu().numpy()[0]
        probabilities = torch.softmax(logits, dim=-1).squeeze()

        # Convert probabilities to structured output
        predictions = [{"label": TARGET_LABELS[i], "probability": round(float(probabilities[i]), 4)} for i in range(len(TARGET_LABELS))]

        return predictions
    except Exception as e:
        return {"error": f"Error analyzing text: {str(e)}"}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No text provided for analysis"}))
        sys.exit(1)

    text = sys.argv[1]

    # Analyze the text
    prediction = analyze_text(text)

    # Print output as JSON for easier parsing by Node.js
    print(json.dumps(prediction))
