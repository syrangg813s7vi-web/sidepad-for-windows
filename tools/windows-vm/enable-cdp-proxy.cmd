@echo off
netsh interface portproxy delete v4tov4 listenport=9223 listenaddress=0.0.0.0 >nul 2>&1
netsh interface portproxy add v4tov4 listenport=9223 listenaddress=0.0.0.0 connectport=9222 connectaddress=127.0.0.1
netsh advfirewall firewall delete rule name="Sidepad CDP QA" >nul 2>&1
netsh advfirewall firewall add rule name="Sidepad CDP QA" dir=in action=allow protocol=TCP localport=9223
netsh interface portproxy show v4tov4
