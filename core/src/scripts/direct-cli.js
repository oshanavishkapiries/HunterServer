/**
 * Direct Mode CLI - Interactive REPL for Browser Tools
 * 
 * Usage: node src/scripts/direct-cli.js
 */
const readline = require('readline');
const { BrowserAutomationAPI } = require('../api');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const api = new BrowserAutomationAPI({ headless: false }); // Visible for CLI
const controller = api.createDirectController();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'browser> '
});

console.log('🤖 Direct Browser CLI');
console.log('Commands: open <url>, analyze, click <id>, type <id> <text>, close, exit');

rl.prompt();

rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) return rl.prompt();

    const [cmd, ...args] = input.split(' ');

    try {
        switch (cmd) {
            case 'open':
                const url = args[0];
                if (!url) console.log('❌ URL required');
                else {
                    console.log(`🌐 Opening ${url}...`);
                    await controller.open(url);
                    console.log('✅ Page loaded');
                }
                break;

            case 'analyze':
                console.log('🧠 Analyzing page (Accessibility Tree)...');
                const analysis = await controller.analyze();
                console.log(JSON.stringify(analysis, null, 2));
                break;

            case 'click':
                const id = args[0];
                if (!id) console.log('❌ Element UUID required');
                else {
                    await controller.click(id);
                    console.log(`✅ Clicked ${id}`);
                }
                break;

            case 'exit':
            case 'quit':
                process.exit(0);
                break;

            default:
                console.log(`❌ Unknown command: ${cmd}`);
        }
    } catch (e) {
        console.error(`❌ Error: ${e.message}`);
    }

    rl.prompt();
});

// Clean exit
process.on('SIGINT', async () => {
    console.log('\nClosing browser...');
    await controller.close();
    process.exit(0);
});
