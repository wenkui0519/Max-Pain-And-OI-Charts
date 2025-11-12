const express = require('express');
const router = express.Router();
const upload = require('../middleware/fileUpload');
const { calculateOptions, calculateMonth } = require('../controllers/optionController');

// 设置API路由
router.post('/calculate', upload.single('file'), calculateOptions);
router.post('/calculate-month', calculateMonth);

module.exports = router;