/**
 * Browser Automation Agent
 * 
 * High-level orchestrator for browser automation tasks.
 * Coordinates planning, execution, memory, and verification.
 * 
 * Features:
 * - Goal planning: Breaks complex goals into sub-tasks
 * - Memory: Short-term, working, and long-term memory
 * - Progress tracking: Loops and step progress
 * 
 * @example
 * const deps = AgentFactory.create({ headless: true });
 * const agent = new Agent(deps);
 * await agent.run('about:blank', 'Go to google and search for weather');
 */

const { AgentFactory } = require('./agent-factory');
const { AgentMemory } = require('./agent-memory');
const { GoalPlanner } = require('./goal-planner');
const { ActionVerifier } = require('./action-verifier');
const { AgentLoop } = require('./agent-loop');

class Agent {
    /**
     * Create a new Agent instance
     * @param {Object} deps - Injected dependencies from AgentFactory
     */
    constructor(deps) {
        // Injected dependencies
        this.browserManager = deps.browserManager;
        this.cookieManager = deps.cookieManager;
        this.sessionManager = deps.sessionManager;
        this.pageStateExtractor = deps.pageStateExtractor;
        this.llm = deps.llmAdapter;
        this.tui = deps.tui;
        this.options = deps.options;

        // Runtime state
        this.executor = null;
        this.highlighter = null;
        this.verifier = null;
        this.currentStep = 0;

        // Memory & Planning
        this.memory = new AgentMemory();
        this.planner = new GoalPlanner(this.llm);
        this.plan = null;

        // Execution loop
        this.loop = new AgentLoop(this);
    }

    /**
     * Initialize browser and create executor
     */
    async initialize() {
        this.log('Starting agent...', 'info');
        this.log(`LLM: ${this.llm.getModelInfo().model}`, 'llm');

        const { page } = await this.browserManager.launch();
        this.log('Browser ready', 'success');

        // Create executor for the page
        this.executor = AgentFactory.createExecutor(page);

        // Create action verifier
        this.verifier = new ActionVerifier(page);

        // Create highlighter if not headless
        if (!this.options.headless) {
            this.highlighter = AgentFactory.createHighlighter(page);
            await this.highlighter.injectStyles();
        }
    }

    /**
     * Run the autonomous agent with a goal
     * @param {string} url - Starting URL
     * @param {string} goal - User's goal in natural language
     * @returns {Object} - Execution results
     */
    async run(url, goal) {
        // Start TUI
        this.startUI(url, goal);

        try {
            // Initialize browser
            if (this.tui) this.tui.setStatus('initializing');
            await this.initialize();

            // Plan the goal
            await this.planGoal(goal);

            // Load cookies
            await this.loadCookies(goal, url);

            // Navigate to starting URL
            await this.navigateTo(url);

            // Main automation loop
            await this.executeLoop(goal);

        } catch (error) {
            this.log(`Error: ${error.message}`, 'error');
            if (this.tui) this.tui.setStatus('error');
        } finally {
            return await this.finalize();
        }
    }

    /**
     * Start the user interface
     */
    startUI(url, goal) {
        if (this.tui) {
            this.tui.start(url, goal);
            this.tui.maxSteps = this.options.maxSteps;
        } else {
            console.log('\n[agent] Browser Automation Agent');
            console.log(`[url] ${url}`);
            console.log(`[goal] ${goal}`);
        }
    }

    /**
     * Plan the goal and set up memory
     */
    async planGoal(goal) {
        this.log('Planning goal...', 'info');
        this.plan = await this.planner.plan(goal);
        this.memory.setGoalPlan(this.plan);

        if (this.plan.steps.length > 1) {
            this.log(`Plan: ${this.plan.steps.length} steps`, 'info');
        }

        // Set loop target if detected
        if (this.plan.loopCount > 0) {
            this.memory.setLoopTarget(this.plan.loopCount);
            this.log(`Loop target: ${this.plan.loopCount}`, 'info');
        }

        // Remember credentials if present
        if (this.plan.hasCredentials) {
            const usernameMatch = goal.match(/(?:username|email|user)[:\s]*["']?([^\s"']+)/i);
            if (usernameMatch) {
                this.memory.remember('username', usernameMatch[1]);
            }
        }
    }

    /**
     * Load cookies for the session
     */
    async loadCookies(goal, url) {
        const cookieResult = await this.cookieManager.loadFromGoalAndUrl(goal, url);
        if (cookieResult.loaded) {
            this.log(`Loaded ${cookieResult.count} cookies from ${cookieResult.file}`, 'cookie');
            this.memory.remember('cookiesLoaded', true);
        }
    }

    /**
     * Navigate to starting URL
     */
    async navigateTo(url) {
        this.log(`Navigating to ${url.substring(0, 50)}...`, 'nav');
        await this.browserManager.goto(url);
        await this.browserManager.waitForStable();
    }

    /**
     * Execute the main automation loop
     */
    async executeLoop(goal) {
        while (this.currentStep < this.options.maxSteps) {
            const stepResult = await this.loop.runStep(goal);

            if (!stepResult.continue) {
                break;
            }
        }
    }

    /**
     * Finalize execution and cleanup
     */
    async finalize() {
        const results = await this.sessionManager.saveResults({
            status: 'completed',
            loopProgress: this.memory.getLoopProgress()
        });

        await this.browserManager.close();
        this.log('Browser closed', 'info');

        if (this.tui) {
            this.tui.printResults(results);
        }

        return results;
    }

    /**
     * Log message via TUI or console
     * @param {string} message - Message to log
     * @param {string} type - Log type (info, success, error, warning, nav, cookie, llm)
     */
    log(message, type = 'info') {
        if (this.tui) {
            this.tui.log(message, type);
        } else {
            const prefix = type === 'success' ? '[done]' : type === 'error' ? '[error]' : `[${type}]`;
            console.log(`${prefix} ${message}`);
        }
    }

    /**
     * Get current status including memory
     * @returns {Object} - Status object
     */
    getStatus() {
        return {
            ...this.sessionManager.getStatus(),
            currentStep: this.currentStep,
            browserRunning: this.browserManager.isRunning(),
            memory: {
                facts: this.memory.getAllFacts(),
                loopProgress: this.memory.getLoopProgress()
            }
        };
    }
}

module.exports = { Agent, AgentFactory };
