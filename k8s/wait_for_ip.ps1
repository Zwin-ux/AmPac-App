$ingressName = "ampac-ingress"

Write-Host "⏳ Waiting for Ingress IP address (this can take 5-10 minutes on GKE)..." -ForegroundColor Yellow

while ($true) {
    $ingress = kubectl get ingress $ingressName -o json | ConvertFrom-Json
    
    $ip = $null
    if ($ingress.status.loadBalancer.ingress) {
        $ip = $ingress.status.loadBalancer.ingress[0].ip
    }

    if ($ip) {
        Write-Host "`n✅ Ingress IP Assigned: $ip" -ForegroundColor Green
        Write-Host "---------------------------------------------------"
        Write-Host "NEXT STEPS FOR FULL TEST:"
        Write-Host "1. Update apps/mobile/.env:"
        Write-Host "   EXPO_PUBLIC_API_URL=http://$ip/api/v1"
        Write-Host "2. Restart Mobile App (press 'r' in terminal)"
        Write-Host "3. Create a website in the app."
        Write-Host "4. View it at: http://$ip/sites/<your-slug>"
        Write-Host "---------------------------------------------------"
        break
    }

    Write-Host -NoNewline "."
    Start-Sleep -Seconds 10
}
