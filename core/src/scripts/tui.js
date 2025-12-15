/**
 * Agent TUI - Terminal User Interface
 * Interactive display for browser automation agent
 */

const readline = require('readline');

class AgentTUI {
    constructor() {
        this.currentStep = 0;
        this.maxSteps = 50;
        this.status = 'idle';
        this.logs = [];
        this.startTime = null;
    }

    // Clear screen
    clear() {
        process.stdout.write('\x1b[2J\x1b[H');
    }

    // Colors
    colors = {
        reset: '\x1b[0m',
        bright: '\x1b[1m',
        dim: '\x1b[2m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        red: '\x1b[31m',
        white: '\x1b[37m',
        bgBlue: '\x1b[44m',
        bgGreen: '\x1b[42m',
        bgYellow: '\x1b[43m',
        bgRed: '\x1b[41m'
    };

    // Print header
    printHeader(url, goal) {
        const c = this.colors;
        console.log(`${c.bgBlue}${c.white}${c.bright}  🤖 Browser Automation Agent  ${c.reset}`);
        console.log(`${c.dim}${'─'.repeat(50)}${c.reset}`);
        console.log(`${c.cyan}URL:${c.reset}  ${url.substring(0, 45)}${url.length > 45 ? '...' : ''}`);
        console.log(`${c.cyan}Goal:${c.reset} ${goal.substring(0, 45)}${goal.length > 45 ? '...' : ''}`);
        console.log(`${c.dim}${'─'.repeat(50)}${c.reset}\n`);
    }

    // Print status bar
    printStatus() {
        const c = this.colors;
        const elapsed = this.startTime ? Math.round((Date.now() - this.startTime) / 1000) : 0;
        const statusColors = {
            'idle': c.dim,
            'initializing': c.yellow,
            'running': c.green,
            'thinking': c.magenta,
            'acting': c.cyan,
            'completed': c.green,
            'error': c.red,
            'terminated': c.red
        };
        const statusColor = statusColors[this.status] || c.white;

        const progress = Math.round((this.currentStep / this.maxSteps) * 20);
        const progressBar = '█'.repeat(progress) + '░'.repeat(20 - progress);

        console.log(`${c.dim}┌${'─'.repeat(48)}┐${c.reset}`);
        console.log(`${c.dim}│${c.reset} Step: ${c.bright}${this.currentStep}/${this.maxSteps}${c.reset} ${c.dim}│${c.reset} Status: ${statusColor}${this.status.toUpperCase()}${c.reset} ${c.dim}│${c.reset} ${elapsed}s`);
        console.log(`${c.dim}│${c.reset} [${c.green}${progressBar}${c.reset}]`);
        console.log(`${c.dim}└${'─'.repeat(48)}┘${c.reset}`);
    }

    // Log message types
    log(message, type = 'info') {
        const c = this.colors;
        const timestamp = new Date().toLocaleTimeString();
        const icons = {
            'info': `${c.blue}ℹ${c.reset}`,
            'success': `${c.green}✓${c.reset}`,
            'warning': `${c.yellow}⚠${c.reset}`,
            'error': `${c.red}✖${c.reset}`,
            'action': `${c.cyan}▶${c.reset}`,
            'llm': `${c.magenta}🤖${c.reset}`,
            'cookie': `${c.yellow}🍪${c.reset}`,
            'nav': `${c.blue}🌐${c.reset}`
        };
        const icon = icons[type] || icons['info'];

        const logEntry = `${c.dim}${timestamp}${c.reset} ${icon} ${message}`;
        this.logs.push(logEntry);
        console.log(logEntry);
    }

    // Print action box
    printAction(action, reasoning) {
        const c = this.colors;
        console.log(`\n${c.bgGreen}${c.white}${c.bright} ACTION ${c.reset} ${c.green}${action}${c.reset}`);
        if (reasoning) {
            const shortReason = reasoning.length > 80 ? reasoning.substring(0, 80) + '...' : reasoning;
            console.log(`${c.dim}└─ ${shortReason}${c.reset}`);
        }
    }

    // Print element info
    printElements(count) {
        const c = this.colors;
        console.log(`${c.dim}   Elements found: ${c.cyan}${count}${c.reset}`);
    }

    // Print cookies status
    printCookies(loaded, filename) {
        const c = this.colors;
        if (loaded) {
            console.log(`${c.green}✓${c.reset} Loaded ${c.bright}${loaded}${c.reset} cookies from ${c.cyan}${filename}${c.reset}`);
        } else {
            console.log(`${c.yellow}⚠${c.reset} No matching cookies found`);
        }
    }

    // Print final results
    printResults(results) {
        const c = this.colors;
        console.log(`\n${c.dim}${'═'.repeat(50)}${c.reset}`);
        console.log(`${c.bgBlue}${c.white}${c.bright}  RESULTS  ${c.reset}\n`);

        const statusColors = {
            'completed': `${c.green}✓ COMPLETED${c.reset}`,
            'terminated': `${c.red}✖ TERMINATED${c.reset}`,
            'error': `${c.red}✖ ERROR${c.reset}`,
            'max_steps_reached': `${c.yellow}⚠ MAX STEPS${c.reset}`
        };

        console.log(`  Status: ${statusColors[results.status] || results.status}`);
        console.log(`  Steps:  ${c.bright}${results.totalSteps}${c.reset}`);
        console.log(`  Time:   ${Math.round((Date.now() - this.startTime) / 1000)}s`);

        if (results.outputFiles && results.outputFiles.length > 0) {
            console.log(`\n  ${c.cyan}Output Files:${c.reset}`);
            results.outputFiles.forEach(f => {
                console.log(`    📄 ${f.path}`);
            });
        }

        if (results.extractedData?.summary) {
            console.log(`\n  ${c.cyan}Summary:${c.reset} ${results.extractedData.summary}`);
        }

        console.log(`\n${c.dim}${'═'.repeat(50)}${c.reset}\n`);
    }

    // Start the TUI
    start(url, goal) {
        this.clear();
        this.startTime = Date.now();
        this.status = 'initializing';
        this.printHeader(url, goal);
        this.log('Starting agent...', 'info');
    }

    // Update step
    updateStep(step) {
        this.currentStep = step;
    }

    // Set status
    setStatus(status) {
        this.status = status;
    }

    // Interactive prompt
    async prompt(question) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise(resolve => {
            rl.question(question, answer => {
                rl.close();
                resolve(answer);
            });
        });
    }

    // Spinner animation
    spinner(message) {
        const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        let i = 0;
        const c = this.colors;

        return setInterval(() => {
            process.stdout.write(`\r${c.cyan}${frames[i]}${c.reset} ${message}`);
            i = (i + 1) % frames.length;
        }, 80);
    }

    stopSpinner(spinner) {
        clearInterval(spinner);
        process.stdout.write('\r' + ' '.repeat(60) + '\r');
    }
}

module.exports = { AgentTUI };
