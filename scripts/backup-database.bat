@echo off
REM ========================================
REM Database Backup Script for Windows
REM Database: tripsmgm_kpi
REM ========================================
REM IMPORTANT: Run this before any schema changes!

setlocal enabledelayedexpansion

REM Configuration
set DB_NAME=tripsmgm_kpi
set BACKUP_DIR=backups

REM Create timestamp
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,8%_%datetime:~8,6%
set BACKUP_FILE=%BACKUP_DIR%\tripsmgm_kpi_%TIMESTAMP%.sql

REM Create backup directory
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo =========================================
echo 📦 Starting MySQL Database Backup
echo =========================================
echo Database: %DB_NAME%
echo Backup file: %BACKUP_FILE%
echo.

REM Prompt for MySQL credentials
set /p DB_HOST="Enter MySQL Host (default: localhost): " || set DB_HOST=localhost
set /p DB_PORT="Enter MySQL Port (default: 3306): " || set DB_PORT=3306
set /p DB_USER="Enter MySQL Username: "
set /p DB_PASS="Enter MySQL Password: "

echo.
echo 🔄 Exporting database...

REM Perform backup
mysqldump ^
  --host=%DB_HOST% ^
  --port=%DB_PORT% ^
  --user=%DB_USER% ^
  --password=%DB_PASS% ^
  --databases %DB_NAME% ^
  --add-drop-database ^
  --routines ^
  --triggers ^
  --events ^
  --single-transaction ^
  --result-file="%BACKUP_FILE%"

if %ERRORLEVEL% equ 0 (
    echo.
    echo =========================================
    echo ✅ Backup completed successfully!
    echo =========================================
    echo File: %BACKUP_FILE%
    echo.
    echo 📋 To restore this backup later:
    echo    mysql -u %DB_USER% -p %DB_NAME% ^< %BACKUP_FILE%
    echo.
    echo ✅ Done!
) else (
    echo.
    echo ❌ Backup failed! Please check your database connection.
    exit /b 1
)

endlocal
pause
