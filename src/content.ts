const parser = new DOMParser();
const BASE_URL = "https://github.com";
const EMPTY_SYMBOL = "∅";
const LOAD_TIMEOUT = 3000;
const GITHUB_GRAY = "#586069";

interface FileData {
    type: string;
    lines: number | string;
}

interface DirData {
    type: string;
    nums: {
        dirNum: number;
        fileNum: number;
    };
}

type Data = DirData | FileData;

interface Row {
    row: Element;
    link: string;
}

interface NodeMap {
    [key: number]: Element;
}

const iterableQuerySelectorAll = (dom: Document, selector: string) => [
    ...dom.querySelectorAll(selector)
];

const zip = (rows: Element[], links: string[]): Row[] =>
    rows.map((row, i) => ({ row: row, link: links[i] }));

// https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
const hashCode = (el: Element) =>
    el.innerHTML
        .split("")
        .reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);

const isType = (regex: RegExp) => (el: Element) => !!el.innerHTML.match(regex);

const isDir = (el: Element) =>
    isType(/aria-label="directory"/)(el) ||
    isType(/aria-label="submodule"/)(el);

const isFile = isType(/aria-label="file"/);

const isSkippable = isType(/title="Go to parent directory"/);

const rows = iterableQuerySelectorAll(document, "tr.js-navigation-item").filter(
    el => !isSkippable(el)
);

const nodeMap: NodeMap = rows.reduce((acc, curr) => {
    acc[hashCode(curr)] = curr;
    return acc;
}, {});

const getLinks = (dom: Document) => {
    const navItems = iterableQuerySelectorAll(dom, "tr .content a");
    return navItems.map(navItem => navItem.getAttribute("href"));
};

const domIsFile = (dom: Document) => !!dom.querySelector("h2#blob-path");

const domIsSymlink = (dom: Document) => dom.querySelector(".file-mode");

const hasLines = (dom: Document) => !!dom.querySelector(`.file-info-divider`);

const getNumOfLines = (dom: Document) => {
    const dividers = iterableQuerySelectorAll(dom, ".file-info-divider");
    const textSet = dividers.reduce((set, divider) => {
        set.add(divider.previousSibling as Text);
        set.add(divider.nextSibling as Text);
        return set;
    }, new Set<Text>());

    const text = [...textSet].filter(node => node.data.match(/lines/))[0];
    const line = text.data;
    return parseInt(line.match(/\d+/)[0], 10);
};

const partitionDirFiles = (dom: Document) => {
    const rows = iterableQuerySelectorAll(dom, "tr.js-navigation-item");
    const dirs = rows.filter(isDir);
    const files = rows.filter(isFile);
    return { dirs, files };
};

const getInfo = (innerDom: Document): Data => {
    // handle file
    if (domIsFile(innerDom)) {
        if (hasLines(innerDom)) {
            const numOfLines = getNumOfLines(innerDom);
            const type = domIsSymlink(innerDom) ? "SYMLINK" : "FILE";
            return {
                type: type,
                lines: numOfLines
            };
        } else {
            return {
                type: "BLOB",
                lines: EMPTY_SYMBOL
            };
        }
    }
    // handle directory
    else {
        const { dirs, files } = partitionDirFiles(innerDom);
        return {
            type: "DIR",
            nums: {
                dirNum: dirs.length,
                fileNum: files.length
            }
        };
    }
};

const displayText = (type: string, data) => {
    let length: number;
    switch (type) {
        case "DIR":
            length = data.nums.dirNum;
            return length > 1 ? `${length} Dirs` : `${length} Dir`;
        case "FILE":
            length = data.nums.fileNum;
            return length > 1 ? `${length} Files` : `${length} File`;
        case "LINE":
            length = data.lines;
            return length > 1 ? `${length} Lines` : `${length} Line`;
        default:
            return "";
    }
};

const addTextElement = (data: string, visible: boolean) => {
    return `<span style="color: ${GITHUB_GRAY}; ${
        visible ? "" : "display: none"
    };" class="github-line-text css-truncate css-truncate-target"> ${data}</span>`;
};

const addEmojiElement = (data: string, visible: boolean) => {
    return `<td class="github-line-emoji"><span style="color: ${GITHUB_GRAY}; ${
        visible ? "" : "display: none"
    };" class="css-truncate css-truncate-target">${data}</span></td>`;
};

interface DataPair {
    row: Element;
    data: Data;
}

const fetchData = async (dom: Document) => {
    // let dataPairs: DataPair[] = [];
    const links = getLinks(dom);
    const fullLinks = links.map(link => `${BASE_URL}${link}`);
    const pairs = zip(rows, fullLinks);

    const promises = pairs.map(async pair => {
        const { row, link } = pair;
        const response = await fetch(link);
        const text = await response.text();
        const innerDom = parser.parseFromString(text, "text/html");
        const data = getInfo(innerDom);
        const key = hashCode(row);
        return { row: nodeMap[key], data: data };
    });

    // pairs.forEach((pair: Row) => {
    //     const { row, link } = pair;
    //     fetch(link)
    //         .then(res => res.text())
    //         .then(html => parser.parseFromString(html, "text/html"))
    //         .then(innerDom => {
    //             const data = getInfo(innerDom);
    //             const key = hashCode(row);
    //             dataPairs.push({ row: nodeMap[key], data: data });
    //         })
    //         .catch(err => console.error(err));
    // });

    return await Promise.all(promises);
};

const inject = (type: string, pair: DataPair, visible: boolean) => {
    const { row, data } = pair;
    if (type === "TEXT") {
        const adjacentCell = row.children[1];
        const input = createInput(type, row, data);
        const lineEl = addTextElement(input, visible);
        adjacentCell.insertAdjacentHTML("beforeend", lineEl);
    } else {
        const adjacentCell = row.lastElementChild;
        const input = createInput(type, row, data);
        const lineEl = addEmojiElement(input, visible);
        adjacentCell.insertAdjacentHTML("beforebegin", lineEl);
    }
};

const createInput = (type: string, row: Element, data: any) => {
    if (type === "TEXT") {
        return isDir(row)
            ? `(${displayText("DIR", data)} / ${displayText("FILE", data)})`
            : `(${displayText("LINE", data)})`;
    } else {
        return isDir(row)
            ? `📁 (${data.nums.dirNum})  |  📄 (${data.nums.fileNum})`
            : `📜 ${data.lines} Lines`;
    }
};

const textSelector = ".github-line-text";
const emojiSelector = ".github-line-emoji span";
const toggleAll = selector => {
    document
        .querySelectorAll(selector)
        .forEach(el =>
            el.style.display === "none"
                ? (el.style.display = "")
                : (el.style.display = "none")
        );
};

const render = (type: string, dataPairs: DataPair[], visible: boolean) =>
    dataPairs.forEach(pair => {
        inject(type, pair, visible);
    });

// alert("error");
const init = async () => {
    const dataPairs = await fetchData(document);
    const storage = chrome.storage.sync || chrome.storage.local;
    storage.get("toggle", data => {
        const toggleState = data.toggle;
        alert(`content: INIT with ${toggleState}`);
        render("TEXT", dataPairs, !toggleState);
        render("EMOJI", dataPairs, toggleState);
    });
};

document.addEventListener("pjax:end", async () => {
    await init();
});

chrome.runtime.onMessage.addListener(async (req, _sender, sendResponse) => {
    if (req.toggle) {
        toggleAll(textSelector);
        toggleAll(emojiSelector);
        alert("content: rerendered");
    }
});
