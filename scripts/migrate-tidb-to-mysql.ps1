<#
.SYNOPSIS
    Script chuyển đổi dữ liệu từ TiDB sang MySQL Server.
    
.DESCRIPTION
    Script này thực hiện 3 bước:
    1. Backup dữ liệu từ TiDB (Database hiện tại).
    2. Import dữ liệu vào MySQL Server mới của công ty.
    3. Kiểm tra kết quả.

.NOTES
    Yêu cầu: Đã cài đặt MySQL Client (mysql.exe, mysqldump.exe) và có trong PATH.
    Nếu chưa có trong PATH, vui lòng sửa biến $MysqlPath bên dưới.
#>

param (
    [Parameter(Mandatory=$false)]
    [string]$TargetPassword
)

# ==========================================
# CẤU HÌNH (Tự động lấy từ .env cũ và yêu cầu mới)
# ==========================================

# 1. Thông tin TiDB (Nguồn) - Lấy từ .env hiện tại
$SourceHost = "gateway01.ap-southeast-1.prod.aws.tidbcloud.com"
$SourcePort = 4000
$SourceUser = "36ZBaPjQ2KHkNvy.root"
$SourcePass = "A76iDK1uW6DcXDPk"
$SourceDb   = "test" 

# 2. Thông tin MySQL Công Ty (Đích) - Từ yêu cầu của bạn
$TargetHost = "vnicc-lxdb001vh.isrk.local"
$TargetPort = 3306
$TargetUser = "tripsmgm_rndus1"
$TargetDb   = "tripsmgm_kpi"

# Đường dẫn đến thư mục bin của MySQL (nếu chưa có trong PATH thì sửa ở đây)
# Ví dụ: $MysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\"
$MysqlPath = "" 

# ==========================================
# LOGIC XỬ LÝ
# ==========================================

$ErrorActionPreference = "Stop"
$BackupFile = "migration_backup.sql"

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "   MIGRATION TOOL: TiDB -> MySQL Server" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# 1. Kiểm tra Password đích
if ([string]::IsNullOrWhiteSpace($TargetPassword)) {
    $TargetPassword = Read-Host "Nhập mật khẩu cho MySQL Server mới ($TargetUser)" -AsSecureString
    $TargetBstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($TargetPassword)
    $TargetPasswordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($TargetBstr)
} else {
    $TargetPasswordPlain = $TargetPassword
}

# 2. Kiểm tra công cụ mysqldump/mysql
$DumpCmd = if ($MysqlPath) { Join-Path $MysqlPath "mysqldump.exe" } else { "mysqldump" }
$ClientCmd = if ($MysqlPath) { Join-Path $MysqlPath "mysql.exe" } else { "mysql" }

if (!(Get-Command $DumpCmd -ErrorAction SilentlyContinue)) {
    Write-Host "LỖI: Không tìm thấy lệnh '$DumpCmd'." -ForegroundColor Red
    Write-Host "Vui lòng cài đặt MySQL Server hoặc thêm thư mục 'bin' vào biến môi trường PATH."
    Write-Host "Hoặc chỉnh sửa biến `$MysqlPath trong file script này."
    exit 1
}

# 3. Thực hiện Backup từ TiDB
Write-Host "`n[1/3] Đang backup dữ liệu từ TiDB ($SourceHost)..." -ForegroundColor Yellow
$DumpArgs = @(
    "--host=$SourceHost",
    "--port=$SourcePort",
    "--user=$SourceUser",
    "--password=$SourcePass",
    "--no-tablespaces",            # TiDB thường cần flag này
    "--set-gtid-purged=OFF",       # Tắt GTID để tương thích export
    "--skip-add-locks",            # Tránh lock table
    "--default-character-set=utf8mb4",
    "--result-file=$BackupFile",
    "$SourceDb"
)

try {
    Start-Process -FilePath $DumpCmd -ArgumentList $DumpArgs -Wait -NoNewWindow
    if (!(Test-Path $BackupFile)) { throw "File backup không được tạo." }
    $Size = (Get-Item $BackupFile).Length / 1MB
    Write-Host "   -> Backup thành công! File: $BackupFile ({0:N2} MB)" -f $Size -ForegroundColor Green
} catch {
    Write-Host "   -> Lỗi khi backup: $_" -ForegroundColor Red
    exit 1
}

# 4. Thực hiện Restore sang MySQL Mới
Write-Host "`n[2/3] Đang restore dữ liệu sang MySQL Server mới ($TargetHost)..." -ForegroundColor Yellow

# Kiểm tra kết nối trước (Optional)
# $TestConn = Test-NetConnection -ComputerName $TargetHost -Port $TargetPort
# if (!$TestConn.TcpTestSucceeded) { Write-Host "Cảnh báo: Không thể kết nối đến $TargetHost port $TargetPort" -ForegroundColor Red }

# Lưu ý: Import cần dùng pipe hoặc input redirection. PowerShell Start-Process khó làm pipe.
# Ta sẽ dùng cmd /c để chạy lệnh mysql < file
$MySqlArgs = "--host=$TargetHost --port=$TargetPort --user=$TargetUser --password=""$TargetPasswordPlain"" $TargetDb"
$UnsecureCmd = "$ClientCmd $MySqlArgs < ""$BackupFile"""

try {
    # Dùng cmd.exe để handle redirection input '<'
    $Process = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "$UnsecureCmd" -Wait -PassThru -NoNewWindow
    
    if ($Process.ExitCode -eq 0) {
        Write-Host "   -> Restore thành công!" -ForegroundColor Green
    } else {
        throw "Process exited with code $($Process.ExitCode)"
    }
} catch {
    Write-Host "   -> Lỗi khi restore: $_" -ForegroundColor Red
    Write-Host "   -> Hãy kiểm tra lại mật khẩu và quyền hạn user."
    exit 1
}

# 5. Hoàn tất
Write-Host "`n[3/3] Hoàn tất quá trình chuyển đổi." -ForegroundColor Cyan
Write-Host "Tiếp theo: Hãy cập nhật file .env với thông tin kết nối mới." -ForegroundColor Yellow
Write-Host "DB_HOST=$TargetHost"
Write-Host "DB_PORT=$TargetPort"
Write-Host "DB_USER=$TargetUser"
Write-Host "DB_NAME=$TargetDb"
