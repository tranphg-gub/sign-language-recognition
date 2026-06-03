# VietSign AI - Hệ Sinh Thái Dịch Ngôn Ngữ Ký Hiệu Đa Tầng

**VietSign AI** là một hệ thống ứng dụng kiến trúc vi dịch vụ (Microservices) kết hợp công nghệ **Hybrid AI** (Edge AI + Cloud AI) để nhận diện thủ ngữ tiếng Việt qua camera theo thời gian thực và tự động dịch thành câu giao tiếp tự nhiên nhờ trí tuệ nhân tạo.

## 🎯 Kiến Trúc Hệ Thống (Architecture)
Dự án được chia làm 3 phân hệ độc lập, giao tiếp với nhau qua API và WebSockets:

1. **Frontend (React.js):** - Ứng dụng Web xử lý trích xuất tọa độ tay trực tiếp trên trình duyệt (Client-side) bằng `MediaPipe`. 
   - Giúp giảm 99% băng thông mạng vì không cần truyền tải luồng video thô lên server.
2. **Backend (Node.js/Express):** - Trạm trung chuyển dữ liệu thời gian thực (Socket.io).
   - Tích hợp **Google Gemini 1.5 Flash API** để xử lý ngôn ngữ tự nhiên (NLP).
3. **AI Core (Python/FastAPI):** - Xử lý mảng dữ liệu (30 frames x 126 tọa độ).
   - Huấn luyện và dự đoán dựa trên mạng học sâu **LSTM (Long Short-Term Memory)**.

## 🧠 Sức mạnh của Hybrid AI
Thay vì mapping cứng nhắc (1 hành động = 1 từ), hệ thống mô phỏng cách bộ não con người hoạt động:
* **Mắt Thần (Edge AI - LSTM):** Nhận diện 11 hành động động học cốt lõi (BẠN, TÔI, GIÚP ĐỠ, TRẠNG THÁI NGHỈ...).
* **Bộ Não (Cloud AI - Gemini):** Tiếp nhận chuỗi từ khóa thô (VD: `[TÔI] + [MỆT] + [GIÚP ĐỠ]`) và suy luận ngữ cảnh để biên dịch thành câu văn hoàn chỉnh: *"Tôi đang rất mệt, bạn có thể giúp tôi được không?"*.

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)
* **Giao diện:** React.js, Web Speech API (Text-to-Speech)
* **Thị giác máy tính (Computer Vision):** Google MediaPipe Hands
* **Học Sâu (Deep Learning):** TensorFlow, Keras (LSTM Model), Scikit-Learn
* **Xử lý ngôn ngữ lớn (LLM):** Google Generative AI (Gemini)
* **Máy chủ & Mạng:** Node.js, Express, Socket.io, FastAPI, Uvicorn

## 🚀 Hướng Dẫn Khởi Động Dự Án

### Bước 1: Khởi động Lõi AI (Terminal 1)
```bash
cd ai_core
pip install -r requirements.txt
pip install scikit-learn
uvicorn main:app --reload --port 8000