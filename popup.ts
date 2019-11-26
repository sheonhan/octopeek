const toggleSwitch = document.getElementById("toggleSwitch");

let toggled;
toggleSwitch.onclick = () => {
    chrome.storage.sync.get(["toggle"], result => {
        (toggleSwitch as any).checked = result.value; // tslint:disable-line
        console.log(`Toggled: ${result.value}`);
    });
    const newValue = !toggled;
    chrome.storage.sync.set({ toggle: newValue }, () => {
        console.log(`Toggle: ${newValue}.`);
    });
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const tabId = tabs[0].id;
        chrome.tabs.sendMessage(tabId, { action: "TOGGLE" }, () => {});
    });
};
