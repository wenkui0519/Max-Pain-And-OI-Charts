const express = require('express');
const router = express.Router();
const upload = require('../middleware/fileUpload');
const { analyzeSilver } = require('../controllers/silverController');

// 添加处理白银库存分析的新路由
router.post('/analyze-silver', upload.single('file'), analyzeSilver);

module.exports = router;