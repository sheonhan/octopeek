// Initialize storage
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({ textIcon: true });

    chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
        chrome.declarativeContent.onPageChanged.addRules([
            {
                actions: [new chrome.declarativeContent.ShowPageAction()],
                conditions: [
                    new chrome.declarativeContent.PageStateMatcher({
                        pageUrl: { hostEquals: "github.com" },
                    }),
                ],
            },
        ]);
    });
});

// Change pageAction icon
chrome.pageAction.onClicked.addListener((info) => {
    chrome.storage.sync.get(null, (data) => {
        const newOption = !data.textIcon;
        const fileName = newOption ? "text" : "emoji";
        chrome.storage.sync.set({ textIcon: newOption });

        // Pass messge to content.ts
        chrome.tabs.query({ active: true, currentWindow: true }, (_) => {
            chrome.tabs.sendMessage(info.id, { action: "TOGGLE" });
        });

        // Set to new icon
        chrome.pageAction.setIcon({
            path: `${fileName}.png`,
            tabId: info.id,
        });
    });
});

chrome.webNavigation.onHistoryStateUpdated.addListener((info) => {
    chrome.storage.sync.get(null, (data) => {
        const fileName = data.textIcon ? "text" : "emoji";
        chrome.pageAction.setIcon({
            path: `${fileName}.png`,
            tabId: info.tabId,
        });
    });
});
