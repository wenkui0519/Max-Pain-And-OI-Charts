const multer = require('multer');
const fs = require('fs');
const path = require('path');

// 创建上传文件夹
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// 配置multer用于文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

module.exports = upload;