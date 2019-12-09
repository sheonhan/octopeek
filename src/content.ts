import { NodeMap } from "./types";
import {
    fetchData,
    hashCode,
    injectPairs,
    isSkippable,
    iterableQuerySelectorAll,
    toggleAll,
} from "./utils";

const curriedRender = (dom: Document, useTextIcon: boolean) => async () => {
    if (document.querySelector(".github-line")) {
        // Already rendered
        return;
    }
    const rows = iterableQuerySelectorAll(dom, "tr.js-navigation-item").filter(
        (el) => !isSkippable(el),
    );

    // Map of hash(Element) => Element
    const nodeMap: NodeMap = rows.reduce((acc, curr) => {
        acc[hashCode(curr)] = curr;
        return acc;
    }, {});

    const dataPairs = await fetchData(dom, rows, nodeMap);
    injectPairs("TEXT", dataPairs, useTextIcon);
    injectPairs("EMOJI", dataPairs, !useTextIcon);
};

chrome.runtime.onMessage.addListener(
    async (message, _, __) => {
        if (message.action === "TOGGLE") {
            toggleAll(".github-line-text");
            toggleAll(".github-line-emoji span");
        }
    },
);

(async () => {
    chrome.storage.sync.get(null, async (data) => {
        const useTextIcon = data.textIcon;
        const render = curriedRender(document, useTextIcon);
        document.addEventListener("pjax:end", render, false);
        await render();
    });
})();
