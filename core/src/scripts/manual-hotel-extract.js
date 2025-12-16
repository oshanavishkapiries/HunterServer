const { BrowserManager } = require('../browser-manager');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../..', '.env') }); // Load ENV for CHROME_PATH

async function runDirect() {
    console.log('🚀 Starting Direct Extraction Script...');

    // Explicitly handle config to ensure it works
    const config = {
        headless: false, // User likely wants to see it
        chromePath: process.env.CHROME_PATH || undefined
    };

    const manager = new BrowserManager(config);

    try {
        await manager.launch();
        const page = await manager.getPage();

        const url = 'https://www.google.com/maps/search/United+States+Atlanta+hotels/@33.7679815,-84.7320595,11z';
        console.log(`📍 Navigating to ${url}`);
        await page.goto(url, { waitUntil: 'load', timeout: 60000 });

        // Selector for hotel cards (feed items)
        const cardSelector = 'a[href*="/maps/place/"]';
        console.log('⏳ Waiting for hotel list...');

        try {
            await page.waitForSelector(cardSelector, { timeout: 30000 });
        } catch (e) { console.log("Standard selector timeout, trying generic..."); }

        // Attempt to scroll to load more
        const scrollBox = 'div[role="feed"]';
        try {
            await page.hover(scrollBox);
            await page.mouse.wheel(0, 2000);
            await page.waitForTimeout(3000);
        } catch (e) { }

        const links = await page.$$eval(cardSelector, els => els.slice(0, 10).map(e => e.href));
        const uniqueLinks = [...new Set(links)].filter(l => !l.includes('/search/'));

        console.log(`🔎 Found ${uniqueLinks.length} potential hotels.`);

        const results = [];

        // Extract 5 hotels
        for (let i = 0; i < Math.min(uniqueLinks.length, 5); i++) {
            const hotelUrl = uniqueLinks[i];
            console.log(`[${i + 1}/5] Extracting: ${hotelUrl}`);

            try {
                await page.goto(hotelUrl, { waitUntil: 'domcontentloaded' });
                await page.waitForTimeout(2500); // Wait for dynamic content

                const data = await page.evaluate(() => {
                    const getText = (sel) => document.querySelector(sel)?.innerText || '';

                    return {
                        name: getText('h1'),
                        rating: getText('span[aria-label*="stars"]'),
                        address: getText('button[data-item-id="address"]'),
                        website: document.querySelector('a[data-item-id="authority"]')?.href || '',
                        phone: getText('button[data-item-id^="phone"]'),
                    };
                });

                console.log(`   ✅ Got: ${data.name}`);
                results.push(data);

            } catch (err) {
                console.error(`   ❌ Failed to extract ${hotelUrl}`, err.message);
            }
        }

        // Save
        const outFile = path.join(__dirname, '../../data/atlanta_hotels_direct.json');
        const dataDir = path.dirname(outFile);
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

        fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
        console.log(`\n🎉 Done! Saved ${results.length} hotels to:`);
        console.log(outFile);

    } catch (error) {
        console.error('Fatal Error:', error);
    } finally {
        await manager.close();
    }
}

runDirect();
