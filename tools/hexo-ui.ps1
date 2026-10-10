# ============================================================
#  我的小站 —— 操作界面（唯一需要关心的引擎）
#
#  这个文件由仓库根目录的「1 开始使用.cmd」启动。
#  平时不需要打开它，双击那个 .cmd 就能看到中文菜单。
#
#  【给维护者的话 · 非常重要】
#  1) 本文件必须保存为「UTF-8 带 BOM」(EF BB BF)。
#     Windows PowerShell 5.1 会把没有 BOM 的 UTF-8 当成 ANSI(GBK) 读，
#     中文于是变成乱码并产生真正的语法错误（实测：脚本直接报错退出）。
#     改写后请补 BOM：
#       py -3 -c "import io;p=r'tools\hexo-ui.ps1';d=io.open(p,encoding='utf-8').read();io.open(p,'w',encoding='utf-8-sig',newline='\r\n').write(d)"
#  2) 根目录的「1 开始使用.cmd」必须保持纯 ASCII（一个非 ASCII 字节都不能有）：
#     cmd.exe 在 chcp 65001 之后遇到非 ASCII 字节会错位解析后面的行。
#     所以：所有中文只允许出现在本文件里。
#  3) 只用 Windows PowerShell 5.1 支持的语法。本机没有 pwsh（实测为空），
#     不要用 `??`、三元 `? :`、`-Parallel` 这类 PS7 才有的写法。
#  4) 读取带中文的文件请显式写 -Encoding UTF8；写文件请用
#     Set-Content -Encoding UTF8 / Out-File -Encoding UTF8。
# ============================================================

# 让中文能在 cmd 窗口里正确显示（不写 BOM 的 UTF-8 编码器）
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
$ErrorActionPreference = 'Continue'

$Root        = Split-Path -Parent $PSScriptRoot   # 仓库根目录 = D:\tools\hexo
$HexoHubPort = 4000      # HexoHub 编辑器的预览服务器占用的端口
$LocalPort   = 4010      # 本脚本启动的本地预览端口（= npm run server）
$SiteUrl     = 'https://Jawooth.github.io/'

# ------------------------------------------------------------
#  小工具
# ------------------------------------------------------------

function Write-Line { param([string]$Text = '') Write-Host $Text }

function Write-Rule {
  Write-Host ('=' * 60) -ForegroundColor DarkCyan
}

function Write-Head {
  param([string]$Text)
  Write-Line
  Write-Host ('-' * 60) -ForegroundColor DarkCyan
  Write-Host ("  " + $Text) -ForegroundColor Cyan
  Write-Host ('-' * 60) -ForegroundColor DarkCyan
  Write-Line
}

function Write-OK   { param([string]$Text) Write-Host ("  [OK] "   + $Text) -ForegroundColor Green }
function Write-Warn { param([string]$Text) Write-Host ("  [!] "    + $Text) -ForegroundColor Yellow }
function Write-Bad  { param([string]$Text) Write-Host ("  [X] "    + $Text) -ForegroundColor Red }

function Read-Text {
  param([string]$Prompt)
  Write-Line
  Write-Host ("  " + $Prompt) -ForegroundColor White
  return (Read-Host "  > ")
}

function Wait-Key {
  Write-Line
  Read-Host "  看完按回车回到菜单" | Out-Null
}

# 端口占用检测：返回占用该端口的进程 Id（没有占用则返回空）
function Get-PortOwner {
  param([int]$Port)
  try {
    $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop
    foreach ($c in $conns) {
      if ($c.OwningProcess -gt 0) { return [int]$c.OwningProcess }
    }
    return $null
  } catch {
    # 老系统上没有这个 cmdlet 时，退回 netstat 解析
    $lines = (netstat -ano | Select-String -SimpleMatch (":" + $Port + " ")) 
    foreach ($l in $lines) {
      $parts = ($l.ToString().Trim() -split '\s+')
      $pidText = $parts[$parts.Length - 1]
      if ($pidText -match '^\d+$') { return [int]$pidText }
    }
    return $null
  }
}

function Get-ProcessLabel {
  param([int]$ProcessId)
  try {
    $p = Get-Process -Id $ProcessId -ErrorAction Stop
    return ($p.ProcessName + " (PID " + $ProcessId + ")")
  } catch {
    return ("PID " + $ProcessId)
  }
}

function Stop-PortOwner {
  param([int]$Port)
  $owner = Get-PortOwner -Port $Port
  if (-not $owner) { return }
  Write-Line ("  正在关闭：" + (Get-ProcessLabel -ProcessId $owner) + " ...")
  & taskkill /F /PID $owner *> $null
  Start-Sleep -Seconds 1
  $still = Get-PortOwner -Port $Port
  if ($still) {
    Write-Warn ("端口 " + $Port + " 仍然被占用，请手动关闭它。")
  } else {
    Write-OK ("端口 " + $Port + " 已经空出来了。")
  }
}

# 如果 HexoHub 的预览服务器（端口 4000）在跑，问一句要不要关掉它。
# 为什么必须先关：hexo clean 会删掉 public\，而 HexoHub 一旦发现端口被占
# 就会杀掉我们的 node 进程，构建半途而废 —— 表现出来就是
# 「我明明发布了，网站却没变」。
function Confirm-Port4000Clear {
  $owner = Get-PortOwner -Port $HexoHubPort
  if (-not $owner) { return $true }

  Write-Line
  Write-Warn ("端口 4000 被占用 —— HexoHub 编辑器的预览服务器正在运行。")
  Write-Line  ("      占用者：" + (Get-ProcessLabel -ProcessId $owner))
  Write-Line  "      它会让这次的生成半途而废，public\ 会是不完整的，"
  Write-Line  "      看起来就像「发布了但网站没变」。"
  Write-Line
  $ans = Read-Host "  先关掉这个预览再继续吗？(y = 关掉并继续 / 直接回车 = 取消)"
  if ($ans -notmatch '^[yY]') {
    Write-Line
    Write-Host "  已取消，什么都没有改动。" -ForegroundColor Yellow
    return $false
  }
  Write-Line
  Stop-PortOwner -Port $HexoHubPort
  return $true
}

# 找一个能用的 Python 3。本机「python」是 Microsoft Store 的假入口，
# 真正的解释器要用「py -3」，所以先试 py -3，再退回 python。
$script:PyExe = $null
function Get-PythonExe {
  if ($script:PyExe) { return $script:PyExe }
  if (Get-Command py -ErrorAction SilentlyContinue) {
    # 用「-3」明确要 Python 3；写成数组是为了调用时逐段展开（PS 5.1 安全做法）
    $script:PyExe = @('py', '-3')
    return $script:PyExe
  }
  if (Get-Command python -ErrorAction SilentlyContinue) {
    $script:PyExe = @('python')
    return $script:PyExe
  }
  return $null
}

# 调用 python 脚本（避免 PS 5.1 里 $arr[1..0] 这种会倒着取值的坑）
function Invoke-Python {
  param(
    [string[]]$Py,
    [string]$Script
  )
  $exe  = $Py[0]
  $argv = @()
  if ($Py.Length -gt 1) { $argv = $Py[1..($Py.Length - 1)] }
  & $exe @argv $Script
}

# 在一个新窗口里跑 npm run server（预览服务器必须一直开着）
function Start-PreviewWindow {
  $node = (Get-Command node -ErrorAction SilentlyContinue).Source
  if ($node) {
    $npmCli = Join-Path (Split-Path -Parent $node) 'node_modules\npm\bin\npm-cli.js'
  } else {
    $npmCli = ''
  }

  if ($node -and (Test-Path $npmCli)) {
    Start-Process -FilePath $node -ArgumentList @($npmCli, 'run', 'server') -WorkingDirectory $Root
  } else {
    # 兜底：让 cmd 来跑（.cmd 文件必须显式用 cmd.exe 启动）
    Start-Process -FilePath 'cmd.exe' -ArgumentList '/k', 'npm run server' -WorkingDirectory $Root
  }
  Start-Sleep -Seconds 6
}

# ------------------------------------------------------------
#  [1] 写 / 改文章 —— 打开 HexoHub
# ------------------------------------------------------------
function Get-HexoHubPath {
  # 顺序：① 卸载注册表记录 ② 本仓库旁边的安装目录 ③ 常见安装位置
  # 注意：注册表里必须按「显示名称包含 HexoHub」过滤。这台电脑的卸载记录里
  # 还有别的软件（例如 DeepSeek Harness）同样带 DisplayIcon，不按名字过滤
  # 就会抓错程序（实测抓到了 DeepSeek Harness.exe）。
  foreach ($hive in @('HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall',
                      'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall')) {
    try {
      $hits = Get-ChildItem -Path $hive -ErrorAction Stop |
              Get-ItemProperty -ErrorAction SilentlyContinue |
              Where-Object {
                $_.PSObject.Properties.Name -contains 'DisplayIcon' -and
                $_.DisplayIcon -and
                (([string]$_.DisplayName) -like '*HexoHub*')
              }
      foreach ($h in $hits) {
        $icon = ([string]$h.DisplayIcon).Trim()
        if ($icon -match '^"([^"]+)"') { $icon = $Matches[1] } else { $icon = ($icon -split ',')[0] }
        $icon = $icon.Trim()
        if ($icon -and (Test-Path -LiteralPath $icon)) { return $icon }
      }
    } catch {
      # 某些机器上不允许读 HKLM，忽略继续找下一个位置
    }
  }

  $candidates = @(
    'D:\tools\HexoHub\hexohub.exe',
    (Join-Path (Split-Path -Parent $Root) 'HexoHub\hexohub.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs\HexoHub\hexohub.exe'),
    (Join-Path $env:ProgramFiles 'HexoHub\hexohub.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'HexoHub\hexohub.exe')
  )
  foreach ($c in $candidates) {
    if ($c -and (Test-Path -LiteralPath $c)) { return $c }
  }
  return $null
}

function Invoke-WritePost {
  $hub = Get-HexoHubPath
  if (-not $hub) {
    Write-Line
    Write-Bad "没有在这台电脑上找到 HexoHub 编辑器。"
    Write-Line
    Write-Line "      找过这些地方："
    Write-Line "        卸载记录（注册表）"
    Write-Line "        D:\tools\HexoHub"
    Write-Line ("        " + (Join-Path (Split-Path -Parent $Root) 'HexoHub'))
    Write-Line ("        " + (Join-Path $env:LOCALAPPDATA 'Programs\HexoHub'))
    Write-Line ("        " + (Join-Path $env:ProgramFiles 'HexoHub'))
    Write-Line
    Write-Line "      请到下面这个网址下载安装（免费、开源）："
    Write-Host  "        https://github.com/forever218/HexoHub" -ForegroundColor Cyan
    Write-Line
    Write-Line "      装好以后再双击一次「1 开始使用.cmd」的 [1] 就行。"
    return
  }

  Write-Line
  Write-Line ("  正在打开：" + $hub)
  Start-Process -FilePath $hub
  Write-Line
  Write-OK   "HexoHub 已经启动。"
  Write-Line "      如果它问你要「博客文件夹」，请选："
  Write-Host ("        " + $Root) -ForegroundColor Cyan
  Write-Line
  Write-Line "      在它里面写完文章、拖进图片，记得按 Ctrl+S 保存。"
  Write-Line "      保存完回到这里，选 [2] 看效果。"
}

# ------------------------------------------------------------
#  [2] 看效果 —— 重新生成 + 打开浏览器预览
# ------------------------------------------------------------
function Open-PreviewBrowser {
  param([string]$Url)
  try { Start-Process $Url | Out-Null } catch { Write-Warn ("没能自动打开浏览器，请手动访问：" + $Url) }
}

function Invoke-Look {
  Write-Head "看效果：重新生成，然后打开本地预览"

  if (-not (Confirm-Port4000Clear)) { return }

  Write-Line "  第 1/2 步：重新生成网站（hexo clean + hexo generate）..."
  Write-Line
  & npm run build
  $rc = $LASTEXITCODE
  Write-Line
  if ($rc -ne 0) {
    Write-Bad ("生成失败（退出码 " + $rc + "）。请把上面红色/报错的文字发给帮你维护网站的人。")
    Write-Line "      也可以先跑一次在线的自检：菜单里的 [7] 全面自检。"
    return
  }
  Write-OK "网站已重新生成。"

  Write-Line
  Write-Line "  第 2/2 步：打开本地预览..."

  $hubOwner = Get-PortOwner -Port $HexoHubPort
  if ($hubOwner) {
    Write-Line ("  HexoHub 的预览（端口 4000）正在运行，直接用它：")
    Write-Host  "        http://localhost:4000/" -ForegroundColor Cyan
    Open-PreviewBrowser -Url 'http://localhost:4000/'
    return
  }

  $localOwner = Get-PortOwner -Port $LocalPort
  if ($localOwner) {
    Write-Line ("  本地预览（端口 4010）已经在跑了，直接打开：")
    Write-Host  "        http://127.0.0.1:4010/" -ForegroundColor Cyan
    Open-PreviewBrowser -Url 'http://127.0.0.1:4010/'
    return
  }

  Write-Line "  现在还没有预览，正在新开一个窗口启动它（端口 4010）..."
  Write-Line
  Write-Warn "新开的那个窗口（写着 Hexo server is running）要一直开着，"
  Write-Line "      关掉它预览就停了。这个菜单窗口可以留着。"
  Write-Line
  Start-PreviewWindow
  Write-Host  "  正在打开浏览器：http://127.0.0.1:4010/" -ForegroundColor Cyan
  Open-PreviewBrowser -Url 'http://127.0.0.1:4010/'
  Write-Line
  Write-Line "  小提醒：预览显示的是「上一次生成」的结果。"
  Write-Line "  改完文章、图片或 source\_data 里的文件，要再选一次 [2] 看效果。"
  Write-Line "  只改了 CSS 的话，浏览器按 Ctrl+F5 刷新就够了。"
}

# ------------------------------------------------------------
#  [3] 发布上线
# ------------------------------------------------------------
function Invoke-DeploySteps {
  param([bool]$SkipBuild)

  if (-not $SkipBuild) {
    Write-Line "  第 1/3 步：清理旧的生成结果（hexo clean）..."
    Write-Line
    & npx hexo clean
    if ($LASTEXITCODE -ne 0) {
      Write-Line
      Write-Bad "这一步失败了，已经停下，线上没有任何改动。"
      return $false
    }

    Write-Line
    Write-Line "  第 2/3 步：重新生成网站（hexo generate）..."
    Write-Line
    & npx hexo generate
    if ($LASTEXITCODE -ne 0) {
      Write-Line
      Write-Bad "生成失败，已经停下，线上没有任何改动。"
      Write-Line "      建议先跑菜单里的 [7] 全面自检，看看是不是有文章写坏了。"
      return $false
    }
  } else {
    Write-Line "  第 1/3 步：清理 —— 已跳过（只重传）"
    Write-Line "  第 2/3 步：生成 —— 已跳过（只重传，直接传 public\ 里现成的东西）"
  }

  Write-Line
  Write-Line "  第 3/3 步：上传到线上（hexo deploy）..."
  Write-Line
  & npx hexo deploy
  if ($LASTEXITCODE -ne 0) {
    Write-Line
    Write-Bad "上传失败。"
    Write-Line "      最常见的原因是本机代理（Clash Verge）掉线了，"
    Write-Line "      报错里会出现 TLS connect error 或 unable to access。"
    Write-Line
    Write-Line "      你的内容一点都没丢：网站已经生成好了，重新选 [3] 发布上线、"
    Write-Line "      再选 [1] 只重传，几秒钟就能补传上去。"
    return $false
  }
  return $true
}

function Invoke-Publish {
  Write-Head "发布上线：生成并上传，别人就能看到了"

  if (-not (Confirm-Port4000Clear)) { return }

  Write-Line "  你想怎么发布？"
  Write-Line
  Write-Line "    [1] 只重传        最快。上次卡在上传那一步（代理/TLS 报错），"
  Write-Line "                      而且之后没改过任何内容时，选这个。"
  Write-Line "    [2] 重建并上传    平时正常发布，选这个。"
  Write-Line "    [3] 算了，退出"
  Write-Line
  $choice = Read-Host "  输入 1、2 或 3，然后按回车"

  switch ($choice) {
    '1' { $skip = $true }
    '2' { $skip = $false }
    '3' { Write-Line; Write-Host "  已取消，什么都没有改动。" -ForegroundColor Yellow; return }
    default {
      Write-Line
      Write-Warn "请输入 1、2 或 3。"
      return
    }
  }

  Write-Line
  if ($skip) {
    Write-Line "  == 只重传：把 public\ 里现成的网站推上去 =="
  } else {
    Write-Line "  == 重建并上传：清理 → 生成 → 上传 =="
  }

  $ok = Invoke-DeploySteps -SkipBuild $skip
  Write-Line
  Write-Host ('-' * 60) -ForegroundColor DarkCyan
  if ($ok) {
    Write-Host "  ✓ 完成" -ForegroundColor Green
    Write-Line
    Write-Line ("  现在打开 " + $SiteUrl)
    Write-Line "  然后按 Ctrl+F5（强制刷新，不然浏览器会给你看旧页面）。"
    Write-Line
    Write-Warn "GitHub Pages 需要 30～120 秒才更新完，马上看不到是正常的，等两分钟再刷。"
  } else {
    Write-Line "  发布没有完成，请看上面的提示。"
  }
  Write-Host ('-' * 60) -ForegroundColor DarkCyan
}

# ------------------------------------------------------------
#  [4] 先备份
# ------------------------------------------------------------
function Invoke-Backup {
  Write-Head "先备份：动手删东西 / 换图片之前，先留个底"

  $stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'
  $dest  = Join-Path $Root ('backup\' + $stamp)
  New-Item -ItemType Directory -Force -Path $dest | Out-Null

  $items = @(
    @{ rel = 'source\_posts'; name = '_posts' },
    @{ rel = 'source\images'; name = 'images' },
    @{ rel = 'source\_data';  name = '_data'  }
  )

  $missing = 0
  foreach ($it in $items) {
    $src = Join-Path $Root $it.rel
    if (Test-Path -LiteralPath $src) {
      $target = Join-Path $dest $it.name
      Copy-Item -LiteralPath $src -Destination $target -Recurse -Force
      $n = (Get-ChildItem -LiteralPath $target -Recurse -File | Measure-Object).Count
      Write-Line ("    " + $it.name.PadRight(9) + " 已经备份 " + $n + " 个文件")
    } else {
      Write-Warn ($it.name.PadRight(9) + " 没找到这个文件夹，跳过了 —— 备份路径可能不对。")
      $missing++
    }
  }

  Write-Line
  Write-Line "  备份放在："
  Write-Host ("    " + $dest) -ForegroundColor Cyan
  Write-Line "  backup\ 这个文件夹不会被上传到网上，也不会进 git，放心用。"
  if ($missing -gt 0) {
    Write-Line
    Write-Warn ("有 " + $missing + " 个来源文件夹没找到，请把上面这句话发给帮你维护网站的人。")
  } else {
    Write-Line
    Write-OK "备份完成。现在可以放心删东西 / 换图片了。"
  }
}

# ------------------------------------------------------------
#  [5] 撤回改动 —— 改坏了就回到上次能用的样子
# ------------------------------------------------------------
function Invoke-Undo {
  Write-Head "撤回改动：改坏了？回到上次能用的样子"

  Write-Line "  看看哪些文件被改过、删过（git status）..."
  Write-Line
  $status = & git -C $Root status --short
  if (-not $status) {
    Write-OK "没有发现任何改动，网站本来就和上次保存的样子一模一样。"
    Write-Line "      不用撤回，直接去 [2] 看效果 或 [3] 发布上线 就行。"
    return
  }

  $status | ForEach-Object { Write-Host ("    " + $_) -ForegroundColor Yellow }
  Write-Line
  Write-Warn "再往下走，上面这些改动会被【全部丢掉】，而且是没法撤销的。"
  Write-Line  "      上次保存的那份（可靠版本）会回来。"
  Write-Line  "      只是看看不想丢的话，现在就按回车。"
  Write-Line
  $ans = Read-Host "  确实要全部丢掉吗？确定请输入 y 再按回车"
  if ($ans -notmatch '^[yY]') {
    Write-Line
    Write-Host "  已取消，什么都没有改动。" -ForegroundColor Yellow
    return
  }

  Write-Line
  Write-Line "  正在撤回..."
  & git -C $Root checkout -- .
  if ($LASTEXITCODE -ne 0) {
    Write-Line
    Write-Bad "撤回失败，请把上面的报错发给帮你维护网站的人。"
    return
  }

  Write-Line
  Write-OK "已经回到上次保存的样子（可靠版本）。"
  Write-Line
  Write-Line "  两点说明："
  Write-Line "    1. backup\ 里的备份完全没有被动过，还在原地。"
  Write-Line "    2. 撤回的是源文件，网站页面还没重新生成 —— 请接着选 [2] 看效果。"
}

# ------------------------------------------------------------
#  [6] 更新歌单
# ------------------------------------------------------------
function Invoke-Music {
  Write-Head "更新歌单：换了网易云歌单之后跑一次"

  $py = Get-PythonExe
  if (-not $py) {
    Write-Line
    Write-Bad "没有找到 Python 3，无法更新歌单。"
    Write-Line "      请先安装 Python 3（安装时勾选 Add to PATH），装完再试。"
    Write-Line "      说明：这台电脑直接输入 python 是打不开的（微软商店的假入口），"
    Write-Line "      真正的解释器要用 py -3，脚本会自己找，你不用管。"
    return
  }

  $pyLabel = ($py -join ' ')
  Write-Line ("  使用的 Python：" + $pyLabel)
  Write-Line
  Write-Line "  正在按 source\_data\music.yml 里的歌单编号重新抓取曲目..."
  Write-Line
  Invoke-Python -Py $py -Script (Join-Path $PSScriptRoot 'fetch-netease.py')
  $rc = $LASTEXITCODE
  Write-Line
  Write-Host ('-' * 60) -ForegroundColor DarkCyan
  if ($rc -eq 0) {
    Write-OK "歌单已经更新，曲目写进了 source\_data\music-tracks.yml"
    Write-Line
    Write-Line "  接下来：回到菜单选 [2] 看效果，确认播放器里的歌对得上。"
    Write-Line "  满意了再选 [3] 发布上线。"
  } else {
    Write-Bad "更新歌单失败。"
    Write-Line "      常见原因：网络不通、代理没开、歌单设成了私密、或者全是 VIP 歌曲。"
    Write-Line "      检查一下网络/代理，然后再试一次。"
  }
  Write-Host ('-' * 60) -ForegroundColor DarkCyan
}

# ------------------------------------------------------------
#  [7] 全面自检
# ------------------------------------------------------------
function Invoke-SelfCheck {
  Write-Head "全面自检：检查断链、没渲染的标签、图片大小"

  $py = Get-PythonExe
  if (-not $py) {
    Write-Line
    Write-Bad "没有找到 Python 3，无法自检。请先安装 Python 3。"
    return
  }

  Write-Line "  正在检查网站内容，可能要十几秒..."
  Write-Line
  Invoke-Python -Py $py -Script (Join-Path $PSScriptRoot 'verify-site.py')
  $rc = $LASTEXITCODE
  Write-Line
  Write-Host ('-' * 60) -ForegroundColor DarkCyan
  if ($rc -eq 0) {
    Write-OK "自检全部通过，网站内容是健康的。"
  } else {
    Write-Bad "自检发现了问题，请看上面的提示。"
    Write-Line "      看不懂没关系：把上面的整段内容发给帮你维护网站的人或 AI。"
    Write-Line "      如果刚才改坏了东西，可以选 [5] 撤回改动，回到上次能用的样子。"
  }
  Write-Host ('-' * 60) -ForegroundColor DarkCyan
}

# ------------------------------------------------------------
#  菜单
# ------------------------------------------------------------
function Show-Menu {
  Write-Line
  Write-Rule
  Write-Host  "  我的小站 —— 只双击这一个文件" -ForegroundColor Cyan
  Write-Rule
  Write-Line
  Write-Host  "  [1] " -ForegroundColor Yellow -NoNewline; Write-Host "写 / 改文章     打开 HexoHub 编辑器（写文章、拖图片）"
  Write-Host  "  [2] " -ForegroundColor Yellow -NoNewline; Write-Host "看效果          重新生成，然后用浏览器打开本地预览"
  Write-Host  "  [3] " -ForegroundColor Yellow -NoNewline; Write-Host "发布上线        生成并上传到线上（别人就能看到了）"
  Write-Host  "  [4] " -ForegroundColor Yellow -NoNewline; Write-Host "先备份          动手删东西/换图片之前，先留个底"
  Write-Host  "  [5] " -ForegroundColor Yellow -NoNewline; Write-Host "撤回改动        改坏了？回到上次能用的样子"
  Write-Host  "  [6] " -ForegroundColor Yellow -NoNewline; Write-Host "更新歌单        换了网易云歌单之后"
  Write-Host  "  [7] " -ForegroundColor Yellow -NoNewline; Write-Host "全面自检        检查断链、没渲染的标签、图片大小"
  Write-Host  "  [0] " -ForegroundColor Yellow -NoNewline; Write-Host "退出"
  Write-Line
  Write-Rule
}

Write-Line
Write-Host "  正在准备（请稍等）..." -ForegroundColor DarkGray

$running = $true
while ($running) {
  Show-Menu
  $choice = Read-Host "  输入数字后按回车"

  # 输入已经被关掉的情况（例如用管道把输入喂完、或从没有输入的地方启动）：
  # Read-Host 会一直返回空，再往下走就变成死循环空转，所以这里直接退出。
  # 双击运行时 IsInputRedirected 是 false，不受影响。
  if ([string]::IsNullOrWhiteSpace($choice) -and [Console]::IsInputRedirected) {
    Write-Line
    Write-Line "  没有更多输入了，退出。"
    break
  }

  switch ($choice) {
    '1' { Invoke-WritePost }
    '2' { Invoke-Look }
    '3' { Invoke-Publish }
    '4' { Invoke-Backup }
    '5' { Invoke-Undo }
    '6' { Invoke-Music }
    '7' { Invoke-SelfCheck }
    '0' {
      Write-Line
      Write-Host "  再见！有需要就再双击一次「1 开始使用.cmd」。" -ForegroundColor Cyan
      Write-Line
      $running = $false
      continue
    }
    default {
      Write-Line
      Write-Warn "看不懂这个输入，请输入 0 到 7 之间的数字，然后按回车。"
      continue
    }
  }

  if ($running) { Wait-Key }
}
