/**
 * Simple Element Highlighter
 * Just adds a border to elements being actioned
 */

class ElementHighlighter {
    constructor(page) {
        this.page = page;
    }

    /**
     * Inject basic styles
     */
    async injectStyles() {
        await this.page.addStyleTag({
            content: `
                .agent-highlight {
                    outline: 5px solid #FF0000 !important;
                    outline-offset: 2px;
                }
            `
        });
    }

    /**
     * Highlight element by XPath
     * @param {string} xpath - Element XPath
     */
    async highlightByXPath(xpath) {
        await this.page.evaluate((xpath) => {
            // Remove previous highlight
            document.querySelectorAll('.agent-highlight').forEach(el => {
                el.classList.remove('agent-highlight');
            });

            // Find element by XPath
            try {
                const result = document.evaluate(
                    xpath,
                    document,
                    null,
                    XPathResult.FIRST_ORDERED_NODE_TYPE,
                    null
                );
                const element = result.singleNodeValue;
                if (element) {
                    element.classList.add('agent-highlight');
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            } catch (e) {
                console.log('Highlight failed:', e);
            }
        }, xpath);
    }

    /**
     * Highlight element by UUID (uses element map)
     * @param {string} uuid
     * @param {string} actionType
     * @param {Object} elementInfo - Element info with xpath
     */
    async highlightAction(uuid, actionType, elementInfo = {}) {
        if (elementInfo && elementInfo.xpath) {
            await this.highlightByXPath(elementInfo.xpath);
        }
    }

    /**
     * Clear all highlights
     */
    async clearAll() {
        await this.page.evaluate(() => {
            document.querySelectorAll('.agent-highlight').forEach(el => {
                el.classList.remove('agent-highlight');
            });
        });
    }

    // Stub methods for compatibility
    async updateStatusPanel() { }
    async showToast() { }
    async highlightAll() { }
}

module.exports = { ElementHighlighter };
