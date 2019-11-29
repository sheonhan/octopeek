let toggleSwitch = document.getElementById("toggleSwitch") as HTMLInputElement;

toggleSwitch.onclick = () => {
    const storage = chrome.storage.sync || chrome.storage.local;
    storage.get("toggle", data => {
        if (data.toggle === undefined) {
            storage.set({ toggle: true });
            toggleSwitch.checked = true;
        } else {
            const newToggleState = !data.toggle;
            storage.set({ toggle: newToggleState });
            toggleSwitch.checked = newToggleState;
            chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                chrome.tabs.sendMessage(tabs[0].id, {
                    toggle: !newToggleState
                });
            });
        }
    });
};
