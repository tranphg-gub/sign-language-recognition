import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, 'model', 'signtalk_lstm.keras')
DATASET_PATH = os.path.join(BASE_DIR, 'dataset')

ACTIONS = [
    'XIN CHÀO', 'TẠM BIỆT', 'CẢM ƠN', 'GIÚP ĐỠ', 
    'TÔI', 'BẠN', 
    'CÓ', 'KHÔNG', 
    'KHỎE', 'MỆT',
    'TRẠNG THÁI NGHỈ'
]
