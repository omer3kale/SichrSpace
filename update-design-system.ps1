# PowerShell script to update design system across all HTML files
$workspaceRoot = "c:\Users\ÖmerÜckale\OneDrive - NEA X GmbH\Desktop\devsichrplace\SichrPlace77-main\SichrPlace77-main\frontend"

# List of critical files to update (excluding already updated ones)
$criticalFiles = @(
    "applicant-dashboard.html",
    "apartments-listing.html", 
    "chat.html",
    "offer.html",
    "viewing-request.html",
    "privacy-policy.html",
    "terms-of-service.html",
    "marketplace.html"
)

# Common CSS variables to inject
$cssVariables = @"
    :root {
      --primary: #2563EB;
      --secondary: #F9FAFB;
      --accent: #40E0D0;
      --muted: #6b7280;
      --danger: #EF4444;
      --background: #FFFFFF;
      --card: #fff;
      --text: #222;
      --border: #E5E7EB;
      --radius: 18px;
      --shadow: 0 2px 12px rgba(0,0,0,0.06);
      --heading-font: "Poppins", sans-serif;
      --body-font: "Roboto", sans-serif;
    }
"@

# Common font links
$fontLinks = @"
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&family=Roboto:wght@300;400;500&display=swap">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
"@

Write-Host "🎨 Starting Design System Update for SichrPlace..." -ForegroundColor Cyan

foreach ($file in $criticalFiles) {
    $filePath = Join-Path $workspaceRoot $file
    
    if (Test-Path $filePath) {
        Write-Host "✏️  Updating $file..." -ForegroundColor Yellow
        
        $content = Get-Content $filePath -Raw
        
        # Skip if already has design system
        if ($content -match "--primary.*#2563EB" -and $content -match "Poppins") {
            Write-Host "✅ $file already has design system" -ForegroundColor Green
            continue
        }
        
        # Add font links if missing
        if ($content -notmatch "Poppins") {
            $content = $content -replace "<title>", "$fontLinks`r`n  <title>"
        }
        
        # Add CSS variables if missing  
        if ($content -notmatch "--primary.*#2563EB") {
            $content = $content -replace "<style>", "<style>`r`n$cssVariables"
        }
        
        # Update common style patterns
        $content = $content -replace "font-family:\s*Arial", "font-family: var(--body-font)"
        $content = $content -replace "color:\s*#2563EB", "color: var(--primary)"
        $content = $content -replace "background:\s*#2563EB", "background: var(--primary)"
        $content = $content -replace "background-color:\s*#2563EB", "background-color: var(--primary)"
        $content = $content -replace "border-radius:\s*10px", "border-radius: 12px"
        $content = $content -replace "border-radius:\s*5px", "border-radius: 8px"
        
        Set-Content $filePath $content -Encoding UTF8
        Write-Host "✅ Updated $file" -ForegroundColor Green
    } else {
        Write-Host "❌ File not found: $file" -ForegroundColor Red
    }
}

Write-Host "Design system update complete!" -ForegroundColor Green
Write-Host "Updated files with consistent design patterns" -ForegroundColor Cyan
