/**
 * AgentLoop - Main automation loop logic
 * 
 * Handles the step-by-step execution of browser automation:
 * - Building LLM context
 * - Executing and verifying actions
 * - Managing memory and observations
 * - Handling terminal actions and loops
 */

const { parseAction, isTerminal } = require('../actions');

class AgentLoop {
    /**
     * @param {Object} agent - Parent Agent instance
     */
    constructor(agent) {
        this.agent = agent;
    }

    /**
     * Build context for LLM with memory and step information
     * @param {string} goal - User's goal
     * @param {Object} pageState - Current page state
     * @returns {Object} - Context object for LLM
     */
    buildContext(goal, pageState) {
        const memoryContext = this.agent.memory.getContextForLLM();
        const stepContext = this.agent.planner.getStepContext(
            this.agent.plan,
            this.agent.memory.workingMemory.currentStep,
            this.agent.memory.workingMemory.loopCount
        );

        return {
            goal,
            simplifiedHtml: pageState.simplifiedHtml,
            elementMap: pageState.elementMap,
            previousActions: this.agent.sessionManager.getLastActions(5),
            currentUrl: pageState.url,
            memoryContext,
            stepContext,
            loopProgress: this.agent.memory.getLoopProgress()
        };
    }

    /**
     * Execute a single step in the automation loop
     * @param {string} goal - User's goal
     * @returns {Object} - Step result { continue, terminal, action }
     */
    async runStep(goal) {
        const agent = this.agent;
        agent.currentStep++;

        // Update TUI
        if (agent.tui) {
            agent.tui.updateStep(agent.currentStep);
            agent.tui.setStatus('running');
        }

        // Get page state
        const pageState = await agent.pageStateExtractor.getState(agent.sessionManager.getId());
        const pageUrlBeforeLLM = pageState.url;
        agent.executor.setElementMap(pageState.elementMap);

        if (agent.tui) {
            agent.tui.printElements(pageState.elementCount);
        }

        // Build context with memory
        if (agent.tui) agent.tui.setStatus('thinking');
        const context = this.buildContext(goal, pageState);

        // Get action from LLM
        const rawAction = await agent.llm.generateAction(context);
        const action = parseAction(rawAction, pageState.elementMap);

        // Staleness check: Did page change during LLM call?
        const currentUrl = agent.browserManager.getPage().url();
        if (currentUrl !== pageUrlBeforeLLM) {
            agent.log('Page changed during LLM call, refreshing...', 'warning');
            agent.memory.observe('Page changed while waiting for LLM response');
            const freshState = await agent.pageStateExtractor.getState(agent.sessionManager.getId());
            agent.executor.setElementMap(freshState.elementMap);
            return { continue: true, terminal: false, action: null };
        }

        // Display action
        this.displayAction(action);

        // Visual highlight
        await this.highlightAction(action, pageState);

        // Execute and verify
        const result = await this.executeAction(action, pageState);

        // Check for terminal action
        if (isTerminal(action.action_type)) {
            const shouldContinue = await this.handleTerminalAction(action);
            if (!shouldContinue) {
                return { continue: false, terminal: true, action };
            }
            return { continue: true, terminal: false, action };
        }

        // Detect observations
        this.detectObservations(action, pageState);

        // Wait between actions
        await agent.browserManager.getPage().waitForTimeout(agent.options.waitBetweenActions);

        return { continue: true, terminal: false, action };
    }

    /**
     * Display action in TUI or console
     * @param {Object} action - Action to display
     */
    displayAction(action) {
        const agent = this.agent;

        if (agent.tui) {
            agent.tui.setStatus('acting');
            agent.tui.printAction(action.action_type, action.reasoning);
        } else {
            console.log(`\n ACTION  ${action.action_type}`);
            console.log(`└─ ${action.reasoning.substring(0, 80)}...`);
        }
    }

    /**
     * Highlight action visually in browser
     * @param {Object} action - Action to highlight
     * @param {Object} pageState - Current page state
     */
    async highlightAction(action, pageState) {
        const agent = this.agent;

        if (!agent.highlighter) return;

        // Update status panel
        await agent.highlighter.updateStatusPanel(
            agent.currentStep,
            action.action_type,
            action.element_id,
            action.text || action.url || action.direction
        );

        // Highlight element if applicable
        if (action.element_id) {
            const elementInfo = pageState.elementMap[action.element_id];
            await agent.highlighter.highlightAction(action.element_id, action.action_type, elementInfo);
        }

        // Show toast
        const targetInfo = action.element_id || action.url || action.text || 'page';
        await agent.highlighter.showToast(
            `${action.action_type.toUpperCase()}: ${targetInfo.substring(0, 30)}`,
            action.action_type
        );
    }

    /**
     * Execute action and update memory
     * @param {Object} action - Action to execute
     * @param {Object} pageState - Current page state
     * @returns {Object} - Execution result
     */
    async executeAction(action, pageState) {
        const agent = this.agent;

        // Capture state before action
        await agent.verifier.captureState();

        // Execute
        const result = await agent.executor.execute(action);

        // Verify
        const verification = await agent.verifier.verify(action.action_type);
        const feedback = agent.verifier.generateFeedback(action.action_type, verification);

        // Log verification result
        if (!verification.likely_succeeded) {
            agent.log(verification.message, 'warning');
            agent.memory.observe(verification.message);
        } else if (verification.urlChanged) {
            agent.log(feedback, 'nav');
        }

        // Update memory
        agent.memory.addAction({
            step: agent.currentStep,
            action_type: action.action_type,
            element_id: action.element_id,
            success: result.success,
            verified: verification.likely_succeeded,
            pageChanged: verification.urlChanged || verification.contentChanged
        });

        // Extract LLM data
        const llmData = action._llmData || null;
        delete action._llmData;

        // Log to session
        agent.sessionManager.logAction({
            step: agent.currentStep,
            ...action,
            pageState: {
                url: pageState.url,
                elementCount: pageState.elementCount,
                simplifiedHtml: pageState.simplifiedHtml,
                elementMap: pageState.elementMap
            },
            llm: llmData ? {
                model: llmData.model,
                prompt: llmData.prompt,
                response: llmData.response,
                usage: llmData.usage
            } : null,
            result: {
                success: result.success,
                error: result.error,
                verification
            }
        });

        return result;
    }

    /**
     * Handle terminal action (complete, terminate, extract)
     * @param {Object} action - Terminal action
     * @returns {boolean} - True if should continue (loop), false if done
     */
    async handleTerminalAction(action) {
        const agent = this.agent;
        const loopProgress = agent.memory.getLoopProgress();

        // Check if we're in a loop and need to continue
        if (loopProgress.target > 0 && loopProgress.remaining > 0) {
            const loopState = agent.memory.incrementLoop();
            agent.log(`Loop progress: ${loopState.current}/${loopState.target}`, 'info');
            agent.memory.observe(`Completed iteration ${loopState.current}`);
            return true; // Continue loop
        }

        agent.log(`Task ${action.action_type}`, 'success');

        if (action.extracted_data) {
            agent.sessionManager.setExtractedData(action.extracted_data);
        }

        return false; // Done
    }

    /**
     * Detect and remember important observations from actions
     * @param {Object} action - Executed action
     * @param {Object} pageState - Current page state
     */
    detectObservations(action, pageState) {
        const agent = this.agent;

        // Detect input observations
        if (action.action_type === 'input_text' && action.element_id) {
            const elemInfo = pageState.elementMap[action.element_id];
            if (elemInfo?.type === 'password') {
                agent.memory.remember('passwordEntered', true);
            }
            if (elemInfo?.name === 'email' || elemInfo?.type === 'email') {
                agent.memory.remember('emailEntered', true);
            }
        }

        // Detect click observations
        if (action.action_type === 'click' && action.element_id) {
            const elemInfo = pageState.elementMap[action.element_id];
            const text = elemInfo?.text?.toLowerCase() || '';

            if (text.includes('sign in') || text.includes('login') || text.includes('log in')) {
                agent.memory.observe('Clicked login button');
            }

            if (text.includes('apply') || text.includes('submit')) {
                agent.memory.observe('Clicked apply/submit button');
                if (agent.memory.getLoopProgress().target > 0) {
                    const loopState = agent.memory.incrementLoop();
                    agent.log(`Applied: ${loopState.current}/${loopState.target}`, 'success');
                }
            }
        }
    }
}

module.exports = { AgentLoop };
