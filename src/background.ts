chrome.runtime.onInstalled.addListener(() => {
    const storage = chrome.storage.sync || chrome.storage.local;
    chrome.storage.sync.get("toggle", data => {
        if (data.toggle === undefined) {
            storage.set({ toggle: false }, () => {});
        }
    });
});

chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
    chrome.declarativeContent.onPageChanged.addRules([
        {
            conditions: [
                new chrome.declarativeContent.PageStateMatcher({
                    pageUrl: { hostEquals: "github.com" }
                })
            ],
            actions: [new chrome.declarativeContent.ShowPageAction()]
        }
    ]);
});

// const sendInitMessage = (tabId: number) => {};

// chrome.webNavigation.onHistoryStateUpdated.addListener(
//     ({ tabId }) => {
//         console.log(`History update: ${JSON.stringify(tabId)}`);
//         try {
//             chrome.tabs.sendMessage(tabId, { message: "INIT" });
//         } catch (e) {
//             console.log(`error ${JSON.stringify(e)}`);
//         }
//     },
//     { url: [{ hostEquals: "github.com" }] }
// );
// chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
//     if (tab.active && changeInfo.status === "complete") {
//         console.info(
//             `tabId ${tabId} updated: ${JSON.stringify(
//                 changeInfo
//             )} tab ${JSON.stringify(tab)}`
//         );
//         try {
//             sendInitMessage(tabId);
//         } catch (error) {
//             console.error(error);
//         }
//     }
// });
