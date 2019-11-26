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

const rows = iterableQuerySelectorAll(document, "tr.js-navigation-item");

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

const isType = (regex: RegExp) => (el: Element) => !!el.innerHTML.match(regex);

const isFile = isType(/aria-label="file"/);

const isDir = (el: Element) =>
    isType(/aria-label="directory"/)(el) ||
    isType(/aria-label="submodule"/)(el);

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

const links = getLinks(document);
const fullLinks = links.map(link => `${BASE_URL}${link}`);
const pairs = zip(rows, fullLinks);

interface DataPair {
    row: Element;
    data: Data;
}

let dataPairs: DataPair[] = [];
pairs.forEach((pair: Row) => {
    const { row, link } = pair;
    fetch(link)
        .then(res => res.text())
        .then(html => parser.parseFromString(html, "text/html"))
        .then(innerDom => {
            const data = getInfo(innerDom);
            const key = hashCode(row);
            dataPairs.push({ row: nodeMap[key], data: data });
        })
        .catch(err => console.error(err));
});

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

const appendElement = (type: string, dataPairs: DataPair[], visible: boolean) =>
    dataPairs.forEach(pair => {
        inject(type, pair, visible);
    });

const render = (type: string, dataPairs: DataPair[], visible: boolean) =>
    setTimeout(() => {
        appendElement(type, dataPairs, visible);
    }, LOAD_TIMEOUT);

render("TEXT", dataPairs, true);
render("EMOJI", dataPairs, false);

chrome.runtime.onMessage.addListener((req, _, sendResponse) => {
    if (req.action === "TOGGLE") {
        toggleAll(textSelector);
        toggleAll(emojiSelector);
        sendResponse({ action: "DONE" });
    }
});
