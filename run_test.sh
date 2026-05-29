#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 24

mkdir -p /home/user/Flying_Class/test_pw
cd /home/user/Flying_Class/test_pw

if [ ! -f package.json ]; then
    npm init -y
    npm install playwright
    npx playwright install chromium --with-deps
fi

cat << 'EOF' > test.js
const { chromium } = require('playwright');

(async () => {
  console.log("Launching browser...");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  console.log("Navigating to Frontend...");
  try {
      await page.goto('http://127.0.0.1:5173', { timeout: 10000 });
      console.log("Frontend loaded.");
      
      // Wait for React to render and perform API check
      await page.waitForTimeout(3000);
      
      const content = await page.content();
      if (content.includes("Backend Connected!")) {
          console.log("SUCCESS: Frontend successfully connected to Backend!");
      } else if (content.includes("Backend Disconnected")) {
          console.log("ERROR: Frontend loaded but could not connect to Backend (CORS or server down).");
      } else {
          console.log("ERROR: Unexpected page content. Might be loading failed.");
      }
      
      await page.screenshot({ path: 'frontend_screenshot.png' });
      console.log("Screenshot saved as frontend_screenshot.png");
  } catch (err) {
      console.error("Failed to load frontend:", err.message);
  }

  console.log("Testing Backend...");
  try {
      const response = await page.request.get('http://flyingclass.localhost:8001/api/method/ping');
      const body = await response.json();
      console.log("Backend response:", body);
  } catch(err) {
      console.error("Failed to reach backend:", err.message);
  }
  
  await browser.close();
})();
EOF

node test.js
