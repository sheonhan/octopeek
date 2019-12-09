import { Data, DataPair, DirData, FileData, NodeMap, Row } from "./types";

const parser = new DOMParser();
const BASE_URL = "https://github.com";
const EMPTY_SYMBOL = "∅";
const GITHUB_GRAY = "#586069";

const EVENT = {
    FETCHED_DATA: new Event("build"),
};

export const iterableQuerySelectorAll = (dom: Document, selector: string) => [
    ...dom.querySelectorAll(selector),
];

const zip = (rows: Element[], links: string[]): Row[] =>
    rows.map((row, i) => ({ row, link: links[i] }));

// https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
export const hashCode = (el: Element) =>
    el.innerHTML
        .split("")
        .reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);

const isType = (regex: RegExp) => (el: Element) => !!el.innerHTML.match(regex);

const isDir = (el: Element) =>
    isType(/aria-label="directory"/)(el) ||
    isType(/aria-label="submodule"/)(el);

const isFile = isType(/aria-label="file"/);

export const isSkippable = isType(/title="Go to parent directory"/);

const getLinks = (dom: Document) => {
    const navItems = iterableQuerySelectorAll(dom, "tr .content a");
    return navItems.map((navItem) => navItem.getAttribute("href"));
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

    const text = [...textSet].filter((node) => node.data.match(/lines/))[0];
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
                type,
                lines: numOfLines,
            };
        } else {
            return {
                type: "BLOB",
                lines: EMPTY_SYMBOL,
            };
        }
    } else {
        const { dirs, files } = partitionDirFiles(innerDom);
        return {
            type: "DIR",
            nums: {
                dirNum: dirs.length,
                fileNum: files.length,
            },
        };
    }
};

const displayText = (type: string, data: Data) => {
    let length: number | string;
    switch (type) {
        case "DIR":
            length = (data as DirData).nums.dirNum;
            return length > 1 ? `${length} Dirs` : `${length} Dir`;
        case "FILE":
            length = (data as DirData).nums.fileNum;
            return length > 1 ? `${length} Files` : `${length} File`;
        case "LINE":
            length = (data as FileData).lines;
            return length > 1 ? `${length} Lines` : `${length} Line`;
        default:
            return "";
    }
};

const loader = (index: number, visible: boolean) =>
    `<div id="loader-${index}" ${visible &&
        "style=display: none;"} class="loader"></div>`;

const addTextElement = (data: string, visible: boolean) => {
    return `<span style="color: ${GITHUB_GRAY}; ${visible &&
        "display: none;"}" class="github-line github-line-text css-truncate css-truncate-target"> ${data}</span>`;
};

const addEmojiElement = (data: string, visible: boolean) => {
    return `<td class="github-line github-line-emoji"><span style="color: ${GITHUB_GRAY}; ${visible &&
        "display: none;"}" class="css-truncate css-truncate-target">${data}</span></td>`;
};

export const fetchData = async (
    dom: Document,
    rows: Element[],
    nodeMap: NodeMap,
) => {
    const links = getLinks(dom);
    const fullLinks = links.map((link) => `${BASE_URL}${link}`);
    const pairs = zip(rows, fullLinks);

    const promises = pairs.map(async (pair) => {
        const { row, link } = pair;
        const response = await fetch(link);
        const text = await response.text();
        const innerDom = parser.parseFromString(text, "text/html");
        const data = getInfo(innerDom);
        const key = hashCode(row);
        return { row: nodeMap[key], data };
    });

    return await Promise.all(promises);
};

export const injectPairs = (
    type: string,
    dataPairs: DataPair[],
    visible: boolean,
) =>
    dataPairs.forEach((pair) => {
        inject(type, pair, visible);
    });

export const injectLoaders = (
    type: string,
    rows: Element[],
    visible: boolean,
) =>
    rows.forEach((row: Element, index: number) => {
        injectLoader(type, row, index, visible);
    });

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

export const injectLoader = (
    type: string,
    row: Element,
    index: number,
    visible: boolean,
) => {
    if (type === "TEXT") {
        const adjacentCell = row.children[1];
        adjacentCell.insertAdjacentHTML("beforeend", loader(index, visible));
    } else {
        const adjacentCell = row.lastElementChild;
        adjacentCell.insertAdjacentHTML("beforebegin", loader(index, visible));
    }
};

const createInput = (type: string, row: Element, data: any) => {
    if (type === "TEXT") {
        return isDir(row)
            ? `(${displayText("DIR", data)} / ${displayText("FILE", data)})`
            : `(${displayText("LINE", data)})`;
    } else {
        return isDir(row)
            ? `📁(${data.nums.dirNum})  +  📄(${data.nums.fileNum})`
            : `📜 ${data.lines} Lines`;
    }
};

export const toggleAll = (selector) => {
    document
        .querySelectorAll(selector)
        .forEach((el) =>
            el.style.display === "none"
                ? (el.style.display = "")
                : (el.style.display = "none"),
        );
};
