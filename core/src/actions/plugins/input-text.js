/**
 * Input Text Action Plugin
 */
const { BaseAction } = require('../base-action');

class InputTextAction extends BaseAction {
    static type = 'input_text';
    static requiresElement = true;
    static description = 'Type text into an input field';

    async execute({ element_id, text }) {
        try {
            let element = null;
            let elementInfo = null;

            // Try to get element by ID first
            try {
                element = await this.getElement(element_id);
                elementInfo = this.elementMap[element_id];
            } catch (e) {
                // Element not found - try to find input field by common selectors
                console.log(`  [input_text] Element ${element_id} not found, searching for input...`);

                // Try common search input selectors
                const selectors = [
                    'input[name="q"]',           // Google
                    'input[type="search"]',
                    'input[aria-label*="Search"]',
                    'input[aria-label*="search"]',
                    'textarea[name="q"]',
                    '[role="searchbox"]',
                    'input[name="search"]',
                    'input[placeholder*="Search"]'
                ];

                for (const selector of selectors) {
                    element = await this.page.$(selector);
                    if (element) {
                        console.log(`  [input_text] Found input via: ${selector}`);
                        break;
                    }
                }

                if (!element) {
                    // Last resort: find any visible text input
                    const inputs = await this.page.$$('input[type="text"], input:not([type])');
                    for (const inp of inputs) {
                        const box = await inp.boundingBox();
                        if (box && box.width > 100) {
                            element = inp;
                            console.log(`  [input_text] Found generic text input`);
                            break;
                        }
                    }
                }

                if (!element) {
                    return { success: false, error: `Could not find element ${element_id} or any suitable input field` };
                }
            }

            // Clear existing content first
            await element.fill('');

            // Type the new text
            await element.fill(text || '');

            // Check if this is a search input - might need Enter key
            if (this.isSearchInput(elementInfo)) {
                console.log(`  [input_text] Auto-pressing Enter for search input`);
                await this.page.keyboard.press('Enter');
                await this.page.waitForTimeout(1000);
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    isSearchInput(elementInfo) {
        if (!elementInfo) return false;

        const searchIndicators = [
            elementInfo.type === 'search',
            elementInfo.name?.toLowerCase()?.includes('search'),
            elementInfo.name?.toLowerCase()?.includes('query'),
            elementInfo.name === 'q',
            elementInfo['aria-label']?.toLowerCase()?.includes('search'),
            elementInfo.placeholder?.toLowerCase()?.includes('search'),
            elementInfo.role === 'searchbox'
        ];

        return searchIndicators.some(Boolean);
    }
}

module.exports = InputTextAction;
