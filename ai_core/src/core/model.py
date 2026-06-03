import os
import numpy as np
from tensorflow.keras.models import load_model
from src.core.config import MODEL_PATH, ACTIONS

# Global model instance
model = None

def load_ai_model():
    global model
    if os.path.exists(MODEL_PATH):
        model = load_model(MODEL_PATH)
    return model

def get_model():
    return model

def predict_sequence(sequence: np.ndarray):
    global model
    if not model:
        return {"error": "Chưa có mô hình. Hãy train trước!"}
    
    if sequence.shape != (30, 126):
        return {"error": f"Sai định dạng khung hình: {sequence.shape}"}
        
    input_data = np.expand_dims(sequence, axis=0)
    res = model.predict(input_data, verbose=0)[0]
    action_idx = np.argmax(res)
    
    return {
        "gesture": ACTIONS[action_idx] if res[action_idx] > 0.75 else "Không rõ",
        "confidence": float(res[action_idx])
    }
