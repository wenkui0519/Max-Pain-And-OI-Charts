@echo off
start cmd /k "node server.js"
timeout /t 2 >nul
start http://localhost:3000/
