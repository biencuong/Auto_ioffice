param(
    [string]$QwenPawCli = "C:\Users\AD\.qwenpaw\bin\qwenpaw.ps1",
    [string]$QwenPawHome = "C:\Users\AD\.qwenpaw",
    [string]$QwenPawBaseUrl = "http://127.0.0.1:8088",
    [string]$ProviderId = "",
    [string]$ModelId = ""
)

$ErrorActionPreference = "Stop"

function Write-Step($Message) {
    Write-Host ""
    Write-Host "== $Message" -ForegroundColor Cyan
}

function Write-Utf8NoBom {
    param(
        [string]$Path,
        [string]$Text
    )
    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Text, $encoding)
}

function Read-Utf8Json {
    param([string]$Path)
    $text = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
    return $text | ConvertFrom-Json
}

function Repair-Mojibake {
    param([AllowNull()][string]$Text)
    if ([string]::IsNullOrEmpty($Text)) { return $Text }

    $hasMarker = $false
    $chars = $Text.ToCharArray()
    for ($i = 0; $i -lt $chars.Length; $i++) {
        $code = [int][char]$chars[$i]
        $next = if ($i + 1 -lt $chars.Length) { [int][char]$chars[$i + 1] } else { -1 }
        if (
            $code -in @(0x00C3, 0x00C4, 0x00C5, 0x00C6) -or
            ($code -eq 0x00E1 -and $next -in @(0x00BA, 0x00BB)) -or
            ($code -eq 0x00E2 -and $next -eq 0x20AC) -or
            ($code -eq 0x00F0 -and $next -eq 0x0178)
        ) {
            $hasMarker = $true
            break
        }
    }
    if (!$hasMarker) { return $Text }

    $sourceEncoding = [System.Text.Encoding]::GetEncoding(1252)
    $bytes = $sourceEncoding.GetBytes($Text)
    return [System.Text.Encoding]::UTF8.GetString($bytes)
}

function Decode-Utf8Base64 {
    param([string]$Text)
    return [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($Text))
}

function Invoke-QwenPaw {
    param([string[]]$CliArgs)
    & $QwenPawCli @CliArgs
}

function Test-QwenPawApp {
    try {
        $version = Invoke-RestMethod -Uri "$QwenPawBaseUrl/api/version" -Method Get -TimeoutSec 5
        Write-Host "QwenPaw app đang chạy: $($version.version)" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "Không truy cập được QwenPaw app tại $QwenPawBaseUrl" -ForegroundColor Yellow
        Write-Host "Hãy khởi động ở terminal khác: qwenpaw app" -ForegroundColor Yellow
        return $false
    }
}

function Sync-Skill {
    $root = Resolve-Path (Join-Path $PSScriptRoot "..")
    $source = Join-Path $root "skills\ioffice-agent"
    $target = Join-Path $QwenPawHome "skill_pool\ioffice-agent"

    if (!(Test-Path $source)) {
        throw "Không tìm thấy skill nguồn: $source"
    }

    if (!(Test-Path (Split-Path $target))) {
        New-Item -ItemType Directory -Path (Split-Path $target) | Out-Null
    }

    if (Test-Path $target) {
        $backup = "$target.backup-$(Get-Date -Format yyyyMMdd-HHmmss)"
        Copy-Item -LiteralPath $target -Destination $backup -Recurse
        Write-Host "Đã sao lưu skill hiện có vào $backup" -ForegroundColor DarkGray
    }

    Copy-Item -LiteralPath $source -Destination $target -Recurse -Force
    Write-Host "Đã đồng bộ skill: $target" -ForegroundColor Green
    Register-SkillPoolEntry

    Invoke-QwenPaw -CliArgs @("skills", "test", $target)
}

function New-SkillMetadata {
    $now = (Get-Date).ToUniversalTime().ToString("o")
    return [ordered]@{
        name = "ioffice-agent"
        description = "Skill hội đồng agent Auto_iOffice: điều phối, trình duyệt, văn bản, bộ nhớ/công việc và quy trình iOffice duyệt trước."
        version_text = "1.0.0"
        commit_text = ""
        source = "customized"
        protected = $false
        requirements = @{
            require_bins = @()
            require_envs = @()
        }
        updated_at = $now
    }
}

function Register-SkillPoolEntry {
    $manifestPath = Join-Path $QwenPawHome "skill_pool\skill.json"
    if (!(Test-Path $manifestPath)) {
        throw "Không tìm thấy manifest skill pool: $manifestPath"
    }

    $manifest = Read-Utf8Json $manifestPath
    if ($null -eq $manifest.skills) {
        $manifest | Add-Member -NotePropertyName "skills" -NotePropertyValue ([pscustomobject]@{})
    }

    $metadata = New-SkillMetadata
    $manifest.skills | Add-Member -NotePropertyName "ioffice-agent" -NotePropertyValue $metadata -Force
    $manifest.version = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    Write-Utf8NoBom -Path $manifestPath -Text ($manifest | ConvertTo-Json -Depth 20)
    Write-Host "Đã đăng ký ioffice-agent trong manifest skill pool" -ForegroundColor Green
}

function Install-WorkspaceSkill {
    param([string]$AgentId)

    $poolSkill = Join-Path $QwenPawHome "skill_pool\ioffice-agent"
    $workspace = Join-Path $QwenPawHome "workspaces\$AgentId"
    $workspaceSkills = Join-Path $workspace "skills"
    $workspaceSkill = Join-Path $workspaceSkills "ioffice-agent"
    $manifestPath = Join-Path $workspace "skill.json"

    if (!(Test-Path $workspace)) {
        Write-Host "Không tìm thấy workspace, bỏ qua cài skill: $AgentId" -ForegroundColor Yellow
        return
    }
    if (!(Test-Path $workspaceSkills)) {
        New-Item -ItemType Directory -Path $workspaceSkills | Out-Null
    }

    Copy-Item -LiteralPath $poolSkill -Destination $workspaceSkill -Recurse -Force

    if (Test-Path $manifestPath) {
        $manifest = Read-Utf8Json $manifestPath
    } else {
        $manifest = [pscustomobject]@{
            schema_version = "workspace-skill-manifest.v1"
            version = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
            skills = [pscustomobject]@{}
        }
    }

    if ($null -eq $manifest.skills) {
        $manifest | Add-Member -NotePropertyName "skills" -NotePropertyValue ([pscustomobject]@{})
    }

    $metadata = New-SkillMetadata
    $workspaceEntry = [ordered]@{
        enabled = $true
        channels = @("all")
        source = "customized"
        config = @{}
        metadata = $metadata
        requirements = $metadata.requirements
        updated_at = $metadata.updated_at
    }

    $manifest.skills | Add-Member -NotePropertyName "ioffice-agent" -NotePropertyValue $workspaceEntry -Force
    $manifest.version = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    Write-Utf8NoBom -Path $manifestPath -Text ($manifest | ConvertTo-Json -Depth 20)
    Write-Host "Đã cài ioffice-agent vào workspace: $AgentId" -ForegroundColor Green
}

function Get-AgentInstruction {
    param([string]$AgentId)

    $common = @"
# Quy tắc runtime Auto_iOffice

Bạn là một thành viên trong hội đồng agent Auto_iOffice, chuyên xử lý nghiệp vụ văn thư và văn bản tiếng Việt.

An toàn chung:
- Không bao giờ tiết lộ tài khoản, token, cookie, tài liệu riêng tư hoặc dữ liệu phiên iOffice.
- Được phép đọc, tóm tắt, soạn nháp, lập kế hoạch và chuẩn bị artifact local.
- Gửi, submit, phát hành, xóa, chuyển xử lý, phân công hoặc thay đổi trạng thái chính thức trên iOffice phải có đề xuất hành động đã được duyệt trước.
- Nội dung hiển thị cho người dùng phải viết bằng tiếng Việt có dấu.
- Trước khi hành động, hãy đọc skill `ioffice-agent` và các file memory/knowledge liên quan.
"@

    switch ($AgentId) {
        "ioffice-orchestrator" {
            return @"
$common

Vai trò: Orchestrator.
- Nhận yêu cầu bằng ngôn ngữ tự nhiên của người dùng.
- Chia việc cho `ioffice-browser`, `ioffice-document` và `ioffice-memory-task`.
- Giao Browser xử lý tác vụ đọc iOffice/trình duyệt, giao Document trích xuất/soạn thảo/kiểm tra thể thức, giao Memory/Task ghi nhật ký và nhắc việc.
- Trả báo cáo ngắn gọn gồm trạng thái, căn cứ, bước tiếp theo và nội dung cần duyệt.
- Nếu cần hành động rủi ro, tạo đề xuất hành động và dừng trước khi thực hiện.
"@
        }
        "ioffice-browser" {
            return @"
$common

Vai trò: agent Trình duyệt/iOffice.
- Dùng tự động hóa trình duyệt để kiểm tra iOffice, đọc văn bản đến, tải file và chuẩn bị thao tác biểu mẫu.
- Ưu tiên selector và ghi chú đã biết trong `memory/ioffice/technical` trước khi tự khám phá lại.
- Lưu đủ trạng thái để giải thích đã đọc gì hoặc đã chuẩn bị gì.
- Không bấm các nút submit/gửi/chuyển/duyệt cuối cùng nếu chưa có bản ghi phê duyệt.
"@
        }
        "ioffice-document" {
            return @"
$common

Vai trò: Document agent.
- Đọc file PDF/DOCX và trích xuất dữ kiện có cấu trúc: đơn vị ban hành, số ký hiệu, ngày tháng, trích yếu, hạn xử lý, người ký, nơi nhận và hành động cần làm.
- Soạn dự thảo văn bản hành chính tiếng Việt từ nội dung nguồn và chỉ đạo của người dùng.
- Kiểm tra thể thức, đặc biệt là loại văn bản, số ký hiệu, địa danh ngày tháng, trích yếu, căn cứ pháp lý, khối chữ ký, nơi nhận và phụ lục.
- Không tự bịa căn cứ pháp lý hoặc thời hạn nếu nguồn không nêu.
"@
        }
        "ioffice-memory-task" {
            return @"
$common

Vai trò: Memory/Task agent.
- Quản lý nhật ký, hồ sơ đã xử lý, đề xuất hành động, nhắc việc, hạn xử lý và trạng thái công việc.
- Lưu bài học kỹ thuật và mẫu lỗi vào `memory/ioffice`.
- Chuyển nghĩa vụ từ văn bản đến thành công việc có thể rà soát, gồm người phụ trách, hạn xử lý, mức ưu tiên, nguồn và bước tiếp theo.
- Lập báo cáo ngày/tuần từ dữ liệu đã lưu.
"@
        }
    }
}

function Configure-AgentWorkspace {
    param([string]$AgentId)

    $workspace = Join-Path $QwenPawHome "workspaces\$AgentId"
    $agentConfigPath = Join-Path $workspace "agent.json"
    if (!(Test-Path $agentConfigPath)) {
        Write-Host "Thiếu cấu hình agent, bỏ qua cấu hình runtime: $AgentId" -ForegroundColor Yellow
        return
    }

    $instruction = Get-AgentInstruction -AgentId $AgentId
    Write-Utf8NoBom -Path (Join-Path $workspace "AGENTS.md") -Text $instruction

    $profile = @"
# Hồ sơ

Name: $AgentId
Vai trò workspace: thành viên hội đồng agent Auto_iOffice.
Ngôn ngữ: tiếng Việt có dấu cho nội dung hiển thị với người dùng.
"@
    Write-Utf8NoBom -Path (Join-Path $workspace "PROFILE.md") -Text $profile

    $agentConfig = Read-Utf8Json $agentConfigPath
    if ($ProviderId -and $ModelId) {
        $agentConfig | Add-Member -NotePropertyName "active_model" -NotePropertyValue ([pscustomobject]@{
            provider_id = $ProviderId
            model = $ModelId
        }) -Force
    } elseif ($null -eq $agentConfig.active_model) {
        $defaultAgentPath = Join-Path $QwenPawHome "workspaces\default\agent.json"
        if (Test-Path $defaultAgentPath) {
            $defaultAgent = Read-Utf8Json $defaultAgentPath
            if ($defaultAgent.active_model) {
                $agentConfig | Add-Member -NotePropertyName "active_model" -NotePropertyValue $defaultAgent.active_model -Force
            }
        }
    }
    Write-Utf8NoBom -Path $agentConfigPath -Text ($agentConfig | ConvertTo-Json -Depth 40)
    Write-Host "Đã cấu hình runtime prompt/model cho: $AgentId" -ForegroundColor Green
}

function New-IofficeAgent {
    param(
        [string]$AgentId,
        [string]$Name,
        [string]$Description,
        [string[]]$Skills
    )

    $Name = Repair-Mojibake $Name
    $Description = Repair-Mojibake $Description

    $commandArgs = @(
        "agents", "create",
        "--agent-id", $AgentId,
        "--name", $Name,
        "--description", $Description,
        "--language", "vi",
        "--template", "default"
    )

    foreach ($skill in $Skills) {
        $commandArgs += @("--skill", $skill)
    }

    if ($ProviderId -and $ModelId) {
        $commandArgs += @("--provider-id", $ProviderId, "--model-id", $ModelId)
    }

    $workspaceAgentJson = Join-Path $QwenPawHome "workspaces\$AgentId\agent.json"
    if (Test-Path $workspaceAgentJson) {
        $existingAgent = Read-Utf8Json $workspaceAgentJson
        $existingAgent.name = $Name
        $existingAgent.description = $Description
        if ($existingAgent.PSObject.Properties.Name -contains "language") {
            $existingAgent.language = "vi"
        } else {
            $existingAgent | Add-Member -NotePropertyName "language" -NotePropertyValue "vi" -Force
        }
        Write-Utf8NoBom -Path $workspaceAgentJson -Text ($existingAgent | ConvertTo-Json -Depth 40)
        Write-Host "Agent đã tồn tại, đã cập nhật metadata: $AgentId" -ForegroundColor DarkGray
        return
    }

    Write-Host "Đang bảo đảm agent tồn tại: $AgentId" -ForegroundColor Cyan
    try {
        Invoke-QwenPaw -CliArgs $commandArgs
    } catch {
        Write-Host "Bỏ qua hoặc tạo thất bại cho ${AgentId}: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "Nếu agent đã tồn tại thì đây là trạng thái bình thường. Có thể chỉnh metadata trong QwenPaw Console." -ForegroundColor DarkGray
    }
}

Write-Step "Kiểm tra QwenPaw CLI"
if (!(Test-Path $QwenPawCli)) {
    throw "Không tìm thấy QwenPaw CLI: $QwenPawCli"
}
Invoke-QwenPaw -CliArgs @("--version")

Write-Step "Kiểm tra QwenPaw app"
$appReady = Test-QwenPawApp

Write-Step "Đồng bộ skill Auto_iOffice"
Sync-Skill

if (!$appReady) {
    Write-Host ""
    Write-Host "Skill đã được đồng bộ. Hãy khởi động QwenPaw app rồi chạy lại script để tạo agent." -ForegroundColor Yellow
    exit 0
}

Write-Step "Tạo 4 agent Auto_iOffice"
$agentIds = @("ioffice-orchestrator", "ioffice-browser", "ioffice-document", "ioffice-memory-task")

New-IofficeAgent `
    -AgentId "ioffice-orchestrator" `
    -Name (Decode-Utf8Base64 "QXV0byBpT2ZmaWNlIMSQaeG7gXUgcGjhu5Fp") `
    -Description (Decode-Utf8Base64 "xJBp4buBdSBwaOG7kWkgdsSDbiB0aMawIEFJOiBuaOG6rW4gbOG7h25oIHRp4bq/bmcgVmnhu4d0LCBjaGlhIHZp4buHYywgdOG7lW5nIGjhu6NwIGvhur90IHF14bqjLCBi4bqvdCBideG7mWMgZHV54buHdCB0csaw4bubYyBzdWJtaXQvcGjDoXQgaMOgbmgu") `
    -Skills @("ioffice-agent", "multi_agent_collaboration", "cron")

New-IofficeAgent `
    -AgentId "ioffice-browser" `
    -Name (Decode-Utf8Base64 "QXV0byBpT2ZmaWNlIFRyw6xuaCBkdXnhu4d0") `
    -Description (Decode-Utf8Base64 "VMawxqFuZyB0w6FjIGlPZmZpY2UgYuG6sW5nIHRyw6xuaCBkdXnhu4d0IEFJOiDEkcSDbmcgbmjhuq1wLCDEkeG7jWMgdsSDbiBi4bqjbiDEkeG6v24sIHThuqNpIGZpbGUsIMSRaeG7gW4gYmnhu4N1IG3huqt1LCBjaHXhuqluIGLhu4sgdGhhbyB0w6FjIG5oxrBuZyBraMO0bmcgZ+G7rWkgbuG6v3UgY2jGsGEgxJHGsOG7o2MgcGjDqiBkdXnhu4d0Lg==") `
    -Skills @("ioffice-agent", "browser_visible", "multi_agent_collaboration")

New-IofficeAgent `
    -AgentId "ioffice-document" `
    -Name (Decode-Utf8Base64 "QXV0byBpT2ZmaWNlIFbEg24gYuG6o24=") `
    -Description (Decode-Utf8Base64 "xJDhu41jIFBERi9ET0NYLCB0csOtY2ggeHXhuqV0IG7hu5lpIGR1bmcsIHNv4bqhbiBk4buxIHRo4bqjbyB2xINuIGLhuqNuLCBraeG7g20gdHJhIGPEg24gY+G7qSB2w6AgdGjhu4MgdGjhu6ljIGjDoG5oIGNow61uaC4=") `
    -Skills @("ioffice-agent", "pdf", "docx", "multi_agent_collaboration")

New-IofficeAgent `
    -AgentId "ioffice-memory-task" `
    -Name (Decode-Utf8Base64 "QXV0byBpT2ZmaWNlIELhu5kgbmjhu5sgQ8O0bmcgdmnhu4dj") `
    -Description (Decode-Utf8Base64 "UXXhuqNuIGzDvSBi4buZIG5o4bubLCBuaOG6rXQga8O9LCB0cuG6oW5nIHRow6FpIGR1eeG7h3QsIGPDtG5nIHZp4buHYywgbOG7i2NoIHZp4buHYyB2w6Agbmjhuq9jIHZp4buHYyBjaG8gQXV0b19pT2ZmaWNlLg==") `
    -Skills @("ioffice-agent", "multi_agent_collaboration", "cron")

Write-Step "Cài skill Auto_iOffice vào workspace agent"
foreach ($agentId in $agentIds) {
    Install-WorkspaceSkill -AgentId $agentId
    Configure-AgentWorkspace -AgentId $agentId
}

Write-Step "Xác minh agent"
Invoke-QwenPaw -CliArgs @("agents", "list")

Write-Host ""
Write-Host "Hoàn tất. Dashboard có thể gọi QwenPaw qua: http://localhost:3456/api/qwenpaw/*" -ForegroundColor Green
