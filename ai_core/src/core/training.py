import os
import numpy as np
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense
from tensorflow.keras.utils import to_categorical
from src.core.config import MODEL_PATH, DATASET_PATH, ACTIONS
import src.core.model

def train_model_task():
    print("Bắt đầu huấn luyện mô hình dưới nền...")
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
        print("Lỗi: Không tìm thấy data, hãy thu thập trước.")
        return
        
    X = np.array(X)
    y = to_categorical(y, num_classes=len(ACTIONS)).astype(int)
    
    model_new = Sequential()
    model_new.add(LSTM(64, return_sequences=True, activation='relu', input_shape=(30, 126)))
    model_new.add(LSTM(128, return_sequences=True, activation='relu'))
    model_new.add(LSTM(64, return_sequences=False, activation='relu'))
    model_new.add(Dense(64, activation='relu'))
    model_new.add(Dense(32, activation='relu'))
    model_new.add(Dense(len(ACTIONS), activation='softmax'))
    
    model_new.compile(optimizer='Adam', loss='categorical_crossentropy', metrics=['categorical_accuracy'])
    
    # Train
    model_new.fit(X, y, epochs=50, batch_size=16)
    
    # Save & Update global model
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    model_new.save(MODEL_PATH)
    
    # Reload model in memory
    src.core.model.load_ai_model()
    print("Huấn luyện thành công và đã load model mới!")
