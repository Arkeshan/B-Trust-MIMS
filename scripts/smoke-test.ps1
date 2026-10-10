Write-Host "B-Trust MIMS - Integration Smoke Test" -ForegroundColor Cyan
Write-Host "Waiting 5 seconds for backend to stabilize..."
Start-Sleep -Seconds 5

$baseUrl = "http://localhost:8080"
$passed = 0
$failed = 0

function Test-Endpoint {
    param ([string]$name, [string]$uri, [string]$method, [string]$body)
    Write-Host "Testing $name..."
    try {
        if ($body) {
            $res = Invoke-RestMethod -Uri $uri -Method $method -ContentType "application/json" -Body $body
        } else {
            $res = Invoke-RestMethod -Uri $uri -Method $method
        }
        Write-Host "  ✓ SUCCESS" -ForegroundColor Green
        $script:passed++
    } catch {
        Write-Host "  X FAILED: $($_.Exception.Message)" -ForegroundColor Red
        $script:failed++
    }
}

# 1. Test Customer Login
Test-Endpoint -name "Customer Login" -uri "$baseUrl/api/auth/login" -method POST -body '{"username":"cust_1","password":"pass1"}'

# 2. Test Agent Login
Test-Endpoint -name "Agent Login" -uri "$baseUrl/api/auth/login" -method POST -body '{"username":"agent_achira","password":"password123"}'

# 3. Test Savings History Fetch
Test-Endpoint -name "Fetch Savings History" -uri "$baseUrl/api/customer/accounts" -method GET

# 4. Test Deposit Transaction
Test-Endpoint -name "Deposit Transaction" -uri "$baseUrl/api/txn/deposit" -method POST -body '{"account_no":"ACC000000001","amount":500}'

# 5. Test Admin Reports Fetch (Should Fail / Return 401 without Admin Auth)
Test-Endpoint -name "Fetch Admin Reports (Unauthorized)" -uri "$baseUrl/api/reports/agents" -method GET

Write-Host "-------------------------"
Write-Host "SMOKE TEST SUMMARY" -ForegroundColor Cyan
Write-Host "PASS: $passed" -ForegroundColor Green
Write-Host "FAIL: $failed" -ForegroundColor Red