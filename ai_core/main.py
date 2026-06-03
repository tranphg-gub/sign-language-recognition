import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.routes import router
from src.core.model import load_ai_model
from src.core.config import DATASET_PATH, MODEL_PATH

# Tắt cảnh báo log rác của TensorFlow
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

app = FastAPI(title="VietSign AI Core Engine")

# BẬT CORS cho phép ReactJS gọi API (hoặc Node.js)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
os.makedirs(DATASET_PATH, exist_ok=True)

# Khởi tạo mô hình khi server start
load_ai_model()

app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)