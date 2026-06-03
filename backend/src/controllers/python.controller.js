const axios = require('axios');
const PYTHON_API = process.env.PYTHON_API || 'http://localhost:8000';

const callPythonPredictor = async (frames) => {
  try {
    const response = await axios.post(`${PYTHON_API}/predict`, { frames }, { timeout: 5000 });
    return response.data;
  } catch (error) {
    console.error('❌ Python Predictor Error:', error.message);
    return { error: 'Lỗi kết nối tới AI Core' };
  }
};

const saveFramesToNpy = async (gestureName, frames, index) => {
  try {
    await axios.post(`${PYTHON_API}/collect`, { gesture_name: gestureName, sequence_index: index, frames: frames }, { timeout: 5000 });
    return true;
  } catch (error) {
    console.error('❌ Save to NPY Error:', error.message);
    return false;
  }
};

const getDatasetStats = async () => {
  try {
    const response = await axios.get(`${PYTHON_API}/stats`, { timeout: 5000 });
    return response.data;
  } catch (error) {
    console.error('❌ Get Stats Error:', error.message);
    return { error: 'Failed to fetch stats' };
  }
};

const trainLSTMModel = async () => {
  try {
    // Thời gian timeout giờ có thể ngắn vì API Python đã chuyển sang chạy ngầm (Background Task)
    const response = await axios.post(`${PYTHON_API}/train`, {}, { timeout: 10000 });
    return { success: true, message: response.data.message };
  } catch (error) {
    console.error('❌ Train Model Error:', error.message);
    return { success: false, message: error.message };
  }
};

module.exports = {
  callPythonPredictor,
  saveFramesToNpy,
  getDatasetStats,
  trainLSTMModel
};
