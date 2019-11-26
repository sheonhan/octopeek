var port = chrome.runtime.connect();

window.addEventListener('message', (event) => {
    if (event.source == window && event.data.type) {
        console.log("Content script received: " + event.data.type);
        port.postMessage(event.data.type);
    }
});



const parser = new DOMParser();
const BASE_URL = "https://github.com";
const EMPTY_SYMBOL = "∅";
const LOAD_TIMEOUT = 3000;
const GITHUB_GRAY = '#586069';

const iterableQuerySelectorAll = (dom, selector) => [
    ...dom.querySelectorAll(selector)
];

const zip = (rows, links) => rows.map((row, i) => ({ row: row, link: links[i] }));

// https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
const hashCode = (el) => el.innerHTML
    .split("")
    .reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);

const rows = iterableQuerySelectorAll(document, "tr.js-navigation-item");

const nodeMap = rows.reduce((acc, curr) => {
    acc[hashCode(curr)] = curr;
    return acc;
}, {});

const createLineElement = (data) => {
    return `<td class="line-number">
<span style="color: ${GITHUB_GRAY}" class="css-truncate css-truncate-target">${data}</span>
</td>`;
};

const getLinks = (dom) => {
    const navItems = iterableQuerySelectorAll(dom, "tr .content a");
    return navItems.map(navItem => navItem.getAttribute("href"));
};

const domIsFile = (dom) => !!dom.querySelector("h2#blob-path");

const domIsSymlink = (dom) => dom.querySelector(".file-mode")

const isType = (regex) => (el) => !!el.innerHTML.match(regex);

const isFile = isType(/aria-label="file"/);

const isDir = (el) => isType(/aria-label="directory"/)(el) || isType(/aria-label="submodule"/)(el);

const hasLines = (dom) => !!dom.querySelector(`.file-info-divider`);

const getNumOfLines = (dom) => {
    const dividers = iterableQuerySelectorAll(dom, ".file-info-divider");
    const textSet = dividers.reduce((set, divider) => {
        set.add(divider.previousSibling);
        set.add(divider.nextSibling);
        return set;
    }, new Set());

    const text = [...textSet].filter(node => node.data.match(/lines/))[0];
    const line = text.data;
    return parseInt(line.match(/\d+/)[0], 10);
};

const partitionDirFiles = (dom) => {
    const rows = iterableQuerySelectorAll(dom, "tr.js-navigation-item");
    const dirs = rows.filter(isDir);
    const files = rows.filter(isFile);
    return { dirs, files };
};

const getInfo = (innerDom) => {
    // handle file
    if (domIsFile(innerDom)) {
        if (hasLines(innerDom)) {
            const numOfLines = getNumOfLines(innerDom);
            const type = domIsSymlink(innerDom) ? 'SYMLINK' : 'FILE';
            return {
                type: type,
                lines: numOfLines,
            };
        } else {
            return {
                type: "BLOB",
                lines: EMPTY_SYMBOL,
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

let dataPairs = [];
pairs.forEach(pair => {
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

const displayEmoji = (type) => (length) => {
    switch (type) {
        case 'DIR':
            return 📁;
        case 'FILE':
            return 📄;
        case 'LINE':
            return 📜;
        default:
            return '';
    }
}

const displayText = (type) => (length) => {
    switch (type) {
        case 'DIR':
            return length > 1 ? 'Dirs' : 'Dir';
        case 'FILE':
            return length > 1 ? 'Files' : 'File';
        case 'LINE':
            return length > 1 ? 'Lines' : 'Line';
        default:
            return '';
    }
}

const createInput = (type, row, data) => {
    if (type === 'TEXT') {
        const input = isDir(row) ? `📁${data.nums.dirNum}  |  📄${data.nums.fileNum}` : ` ✒️ ${data.lines} lines`;
    } else {

    }
    const input = isDir(row) ? `📁${data.nums.dirNum}  |  📄${data.nums.fileNum}` : ` ✒️ ${data.lines} lines`;

}
const inject = (type) => (pair) => {
    const { row, data } = pair;
    const adjacentCell = type === 'TEXT'
        ? row.children[1].firstElementChild
        : row.lastElementChild;
    const input = createInput(type, row, data)
    const lineEl = createLineElement(input);
    adjacentCell.insertAdjacentHTML("beforebegin", lineEl);
}

const selectedCell = row.children[1].firstElementChild;
// const input = isDir(row) ? `📁 ${data.nums.dirNum}  | 📄 ${data.nums.fileNum} ` : `✒️ ${data.lines} Lines`;
const input = isDir(row) ? `(${data.nums.dirNum} Dirs / ${data.nums.fileNum} Files)` : `(${data.lines} Lines)`;
const lineEl = createLineElement(input);


const appendLineElements = (type, dataPairs) => {
    dataPairs.forEach(pair => {
        inject(type)(pair)
    });
};

setTimeout(() => {
    appendLineElements('text', dataPairs);
}, LOAD_TIMEOUT);
