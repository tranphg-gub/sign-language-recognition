import os
import shutil
import numpy as np
from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from typing import List
from src.core.config import DATASET_PATH, ACTIONS
from src.core.model import predict_sequence
from src.core.training import train_model_task

router = APIRouter()

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

@router.post("/predict")
async def predict_gesture(payload: PredictPayload):
    sequence = np.array(payload.frames)
    return predict_sequence(sequence)

@router.post("/collect")
async def collect_data(payload: CollectPayload):
    clean_gesture_name = payload.gesture_name.strip()
    gesture_dir = os.path.join(DATASET_PATH, clean_gesture_name)
    os.makedirs(gesture_dir, exist_ok=True)
    
    file_path = os.path.join(gesture_dir, f"{payload.sequence_index}.npy")
    sequence = np.array(payload.frames)
    np.save(file_path, sequence)
    return {"success": True, "message": f"Đã lưu: {file_path}"}

@router.post("/delete_last")
async def delete_last_data(payload: DeletePayload):
    clean_name = payload.gesture_name.strip()
    file_path = os.path.join(DATASET_PATH, clean_name, f"{payload.sequence_index}.npy")
    if os.path.exists(file_path):
        os.remove(file_path)
        return {"success": True, "message": "Đã xóa 1 file lỗi"}
    return {"error": "Không tìm thấy file để xóa"}

@router.post("/delete_all")
async def delete_all_data(payload: DeleteAllPayload):
    clean_name = payload.gesture_name.strip()
    dir_path = os.path.join(DATASET_PATH, clean_name)
    if os.path.exists(dir_path):
        shutil.rmtree(dir_path)
        return {"success": True, "message": "Đã xóa toàn bộ thư mục"}
    return {"error": "Thư mục trống"}

@router.get("/stats")
async def get_stats():
    stats = {"total_gestures": len(ACTIONS), "samples_per_gesture": {}}
    for action in ACTIONS:
        action_path = os.path.join(DATASET_PATH, action)
        if os.path.exists(action_path):
            stats["samples_per_gesture"][action] = len(os.listdir(action_path))
        else:
            stats["samples_per_gesture"][action] = 0
    return stats

@router.post("/train")
async def train_model(background_tasks: BackgroundTasks):
    background_tasks.add_task(train_model_task)
    return {"success": True, "message": "Đã bắt đầu huấn luyện chạy ngầm. Vui lòng chờ vài phút..."}
