const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
} else {
  console.warn("⚠️ GEMINI_API_KEY không được cung cấp, tính năng dịch sẽ fallback về nối từ.");
}

const translateSignLanguage = async (req, res) => {
  try {
    const { words } = req.body;
    if (!words || words.length === 0) {
      return res.json({ success: false, message: "Không có từ khóa nào." });
    }

    if (!genAI) {
      return res.json({ success: true, sentence: words.join(" ") });
    }

    const prompt = `Bạn là một trợ lý phiên dịch ngôn ngữ ký hiệu tiếng Việt.
    Nhiệm vụ của bạn là nhận các từ khóa rời rạc do hệ thống AI thị giác máy tính nhận diện được, sau đó ghép chúng lại thành một câu giao tiếp tiếng Việt hoàn chỉnh, tự nhiên và lịch sự nhất có thể.
    Chỉ trả về ĐÚNG 1 câu kết quả, KHÔNG giải thích, KHÔNG thêm bớt ý tưởng ngoài luồng.
    Các từ khóa: ${words.join(", ")}`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const sentence = result.response.text().trim();

    res.json({ success: true, sentence: sentence });
  } catch (error) {
    console.error("❌ Lỗi từ Gemini:", error.message);
    res.status(500).json({ success: false, error: "Hệ thống ngôn ngữ đang bận." });
  }
};

module.exports = { translateSignLanguage };
