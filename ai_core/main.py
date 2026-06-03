import os
import shutil
import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

# Tắt cảnh báo log rác của TensorFlow
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
from tensorflow.keras.models import load_model, Sequential
from tensorflow.keras.layers import LSTM, Dense
from tensorflow.keras.utils import to_categorical

app = FastAPI(title="SignTalk AI Engine")

# BẬT CORS cho phép ReactJS gọi API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(BASE_DIR, 'model', 'signtalk_lstm.keras')
DATASET_PATH = os.path.join(BASE_DIR, 'dataset')

ACTIONS = [
    'XIN CHÀO', 'TẠM BIỆT', 'CẢM ƠN', 'GIÚP ĐỠ', 
    'TÔI', 'BẠN', 
    'CÓ', 'KHÔNG', 
    'KHỎE', 'MỆT',
    'TRẠNG THÁI NGHỈ'
]

os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
os.makedirs(DATASET_PATH, exist_ok=True)

model = load_model(MODEL_PATH) if os.path.exists(MODEL_PATH) else None

class PredictPayload(BaseModel):
    frames: List[List[float]] 

class CollectPayload(BaseModel):
    gesture_name: str
    sequence_index: int
    frames: List[List[float]]

class DeletePayload(BaseModel):
    gesture_name: str
    sequence_index: int

class DeleteAllPayload(BaseModel):
    gesture_name: str

@app.post("/predict")
async def predict_gesture(payload: PredictPayload):
    global model
    if not model: 
        return {"error": "Chưa có mô hình. Hãy train trước!"}
    
    sequence = np.array(payload.frames)
    if sequence.shape != (30, 126):
        return {"error": f"Sai định dạng khung hình: {sequence.shape}"}
        
    input_data = np.expand_dims(sequence, axis=0)
    res = model.predict(input_data, verbose=0)[0]
    action_idx = np.argmax(res)
    
    return {
        "gesture": ACTIONS[action_idx] if res[action_idx] > 0.75 else "Không rõ",
        "confidence": float(res[action_idx])
    }

@app.post("/collect")
async def collect_data(payload: CollectPayload):
    clean_gesture_name = payload.gesture_name.strip()
    gesture_dir = os.path.join(DATASET_PATH, clean_gesture_name)
    os.makedirs(gesture_dir, exist_ok=True)
    
    file_path = os.path.join(gesture_dir, f"{payload.sequence_index}.npy")
    sequence = np.array(payload.frames)
    np.save(file_path, sequence)
    return {"success": True, "message": f"Đã lưu: {file_path}"}

@app.post("/delete_last")
async def delete_last_data(payload: DeletePayload):
    clean_name = payload.gesture_name.strip()
    file_path = os.path.join(DATASET_PATH, clean_name, f"{payload.sequence_index}.npy")
    if os.path.exists(file_path):
        os.remove(file_path)
        return {"success": True, "message": "Đã xóa 1 file lỗi"}
    return {"error": "Không tìm thấy file để xóa"}

@app.post("/delete_all")
async def delete_all_data(payload: DeleteAllPayload):
    clean_name = payload.gesture_name.strip()
    dir_path = os.path.join(DATASET_PATH, clean_name)
    if os.path.exists(dir_path):
        shutil.rmtree(dir_path)
        return {"success": True, "message": "Đã xóa toàn bộ thư mục"}
    return {"error": "Thư mục trống"}

@app.get("/stats")
async def get_stats():
    stats = {"total_gestures": len(ACTIONS), "samples_per_gesture": {}}
    for action in ACTIONS:
        action_path = os.path.join(DATASET_PATH, action)
        if os.path.exists(action_path):
            stats["samples_per_gesture"][action] = len(os.listdir(action_path))
        else:
            stats["samples_per_gesture"][action] = 0
    return stats

# ================= ĐÂY CHÍNH LÀ BỘ NÃO BỊ THIẾU =================
@app.post("/train")
async def train_model():
    global model
    X, y = [], []
    
    for idx, action in enumerate(ACTIONS):
        action_path = os.path.join(DATASET_PATH, action)
        if not os.path.exists(action_path):
            continue
        for file_name in os.listdir(action_path):
            if file_name.endswith(".npy"):
                res = np.load(os.path.join(action_path, file_name))
                X.append(res)
                y.append(idx)
                
    if len(X) == 0:
        return {"error": "Lỗi: Không tìm thấy data, hãy thu thập trước."}
        
    X = np.array(X)
    y = to_categorical(y, num_classes=len(ACTIONS)).astype(int)
    
    # 1. Khởi tạo kiến trúc mạng nơ-ron LSTM
    model_new = Sequential()
    model_new.add(LSTM(64, return_sequences=True, activation='relu', input_shape=(30, 126)))
    model_new.add(LSTM(128, return_sequences=True, activation='relu'))
    model_new.add(LSTM(64, return_sequences=False, activation='relu'))
    model_new.add(Dense(64, activation='relu'))
    model_new.add(Dense(32, activation='relu'))
    model_new.add(Dense(len(ACTIONS), activation='softmax'))
    
    model_new.compile(optimizer='Adam', loss='categorical_crossentropy', metrics=['categorical_accuracy'])
    
    # 2. Bắt đầu ép máy tính học dữ liệu (Epochs)
    model_new.fit(X, y, epochs=50, batch_size=16)
    
    # 3. Lưu model vào ổ cứng và nạp vào bộ nhớ
    model_new.save(MODEL_PATH)
    model = model_new
    
    return {"success": True, "message": "Đã huấn luyện AI thành công!"}