@echo off
echo ========================================
echo PROJECT CLEANUP SCRIPT
echo ========================================
echo.
echo This will:
echo - Delete OneLake test/diagnostic scripts
echo - Delete old backup files
echo - Delete OneLake documentation (temporary)
echo - Clean .next build cache
echo - Remove azure-function/node_modules ONLY (keep source)
echo.
echo Azure Function source code will be KEPT for production use!
echo.
pause

echo.
echo [1/6] Deleting OneLake diagnostic scripts...
del scripts\check-onelake-databases.ts 2>nul
del scripts\check-sql-endpoint.ts 2>nul
del scripts\diagnose-onelake.ts 2>nul
del scripts\diagnose-onelake-connection.ts 2>nul
del scripts\find-correct-database.ts 2>nul
del scripts\find-database-name.ts 2>nul
del scripts\find-sql-endpoint-dataset.ts 2>nul
del scripts\step-by-step-test.ts 2>nul
del scripts\test-onelake-connection.ts 2>nul
del scripts\test-onelake-auth.ts 2>nul
del scripts\test-network.ts 2>nul
del scripts\verify-sp-credentials.ts 2>nul
del scripts\test-with-token.ts 2>nul
del scripts\test-direct-connection.ts 2>nul
del scripts\test-with-access-token.ts 2>nul
del scripts\test-fabric-rest-api.ts 2>nul
del scripts\test-onelake-fabric-api.ts 2>nul
del scripts\test-onelake-storage.ts 2>nul
del scripts\test-app-onelake.ts 2>nul
del scripts\test-api-endpoints.ts 2>nul
del scripts\init-onelake.js 2>nul
del scripts\grant-permissions.sql 2>nul
del scripts\onelake-schema.sql 2>nul
del scripts\onelake-schema-notebook.sql 2>nul
echo Done!

echo.
echo [2/6] Deleting old/backup files...
del lib\db-old.ts 2>nul
del .env.temp 2>nul
echo Done!

echo.
echo [3/6] Deleting OneLake documentation...
del ADMIN_PORTAL_SETUP.md 2>nul
del AZURE_FUNCTION_QUICK_START.md 2>nul
del CREATE_NEW_SERVICE_PRINCIPAL.md 2>nul
del FIX_ONELAKE_ACCESS.md 2>nul
del FIX_ONELAKE_CONNECTION.md 2>nul
del QUICK_START_ONELAKE.md 2>nul
del ONELAKE_SETUP_GUIDE.md 2>nul
del ONELAKE_README.md 2>nul
del ONELAKE_FIX_STEPS.md 2>nul
del test-after-enable.bat 2>nul
rmdir /s /q docs 2>nul
rmdir /s /q migrations 2>nul
echo Done!

echo.
echo [4/6] Cleaning .next build cache (426MB)...
rmdir /s /q .next 2>nul
echo Done!

echo.
echo [5/6] Removing azure-function/node_modules ONLY...
echo (Source code will be kept for production!)
rmdir /s /q azure-function\node_modules 2>nul
echo Done!

echo.
echo [6/6] Killing old dev servers...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq npm*" 2>nul
echo Done!

echo.
echo ========================================
echo CLEANUP COMPLETED!
echo ========================================
echo.
echo Summary:
echo - Removed: OneLake test scripts
echo - Removed: Old backup files
echo - Removed: OneLake documentation
echo - Removed: .next cache (will rebuild)
echo - Removed: azure-function/node_modules
echo - KEPT: azure-function source code (for production)
echo.
echo Space saved: ~450-500MB
echo.
echo Next steps:
echo 1. Restart dev server: npm run dev
echo 2. When ready for production, reinstall azure-function:
echo    cd azure-function
echo    npm install
echo.
pause
