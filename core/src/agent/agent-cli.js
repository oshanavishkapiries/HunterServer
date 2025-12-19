#!/usr/bin/env node
/**
 * Agent CLI Entry Point
 * 
 * Parses command line arguments and runs the browser automation agent.
 * 
 * Usage:
 *   npm run agent "<goal>"
 *   npm run agent "<goal>" -- --headless
 *   npm run agent "<goal>" -- --llm gemini
 */

require('dotenv').config();

const { Agent } = require('./agent');
const { AgentFactory } = require('./agent-factory');
const { config } = require('../llm');

/**
 * Parse command line arguments
 * @param {string[]} args - Process arguments
 * @returns {Object} - Parsed options
 */
function parseArgs(args) {
    // Parse --llm flag
    let llmProvider = config.defaultProvider;
    const llmIndex = args.indexOf('--llm');
    if (llmIndex !== -1 && args[llmIndex + 1]) {
        llmProvider = args[llmIndex + 1];
    }

    // Get goal (all non-flag args joined)
    const nonFlagArgs = args.filter((arg, i) => {
        if (arg.startsWith('--')) return false;
        if (i > 0 && args[i - 1] === '--llm') return false;
        return true;
    });

    let url = 'about:blank';
    let goal = '';

    // Check if first arg is explicit URL
    const firstArg = nonFlagArgs[0];
    if (firstArg && (firstArg.startsWith('http://') || firstArg.startsWith('https://'))) {
        url = firstArg;
        goal = nonFlagArgs.slice(1).join(' ');
    } else {
        goal = nonFlagArgs.join(' ');
    }

    return {
        goal,
        url,
        llmProvider,
        headless: args.includes('--headless'),
        quiet: args.includes('--quiet'),
        maxSteps: 100
    };
}

/**
 * Print usage information
 */
function printUsage() {
    console.log('Usage: npm run agent "<goal>"');
    console.log('');
    console.log('Examples:');
    console.log('  npm run agent "Go to google.com and search for weather"');
    console.log('  npm run agent "Go to linkedin, login and apply to 5 jobs"');
    console.log('');
    console.log('Options:');
    console.log('  --headless    Run browser in headless mode');
    console.log('  --llm <name>  LLM provider (gemini, openrouter, ollama, cerebras)');
    console.log('  --quiet       Disable verbose logging');
}

/**
 * Main CLI entry point
 */
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        printUsage();
        process.exit(1);
    }

    const options = parseArgs(args);

    if (!options.goal) {
        console.error('Error: No goal provided');
        printUsage();
        process.exit(1);
    }

    console.log(` Using LLM provider: ${options.llmProvider}`);

    // Create agent with factory
    const deps = AgentFactory.create({
        headless: options.headless,
        verbose: !options.quiet,
        llmProvider: options.llmProvider,
        maxSteps: options.maxSteps
    });

    const agent = new Agent(deps);

    try {
        await agent.run(options.url, options.goal);
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    main();
}

module.exports = { main, parseArgs };
