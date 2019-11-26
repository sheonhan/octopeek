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

const displayText = (type, data) => {
    let length;
    switch (type) {
        case 'DIR':
            length = data.nums.dirNum;
            return length > 1 ? `${length} Dirs` : `${length} Dir`;
        case 'FILE':
            length = data.nums.fileNum;
            return length > 1 ? `${length} Files` : `${length} File`;
        case 'LINE':
            length = data.lines
            return length > 1 ? `${length} Lines` : `${length} Line`;
        default:
            return '';
    }
}


const addTextElement = (data, visible) => {
    return `<span style="color: ${GITHUB_GRAY}; ${visible ? '' : 'display: none'};" class="github-line-text css-truncate css-truncate-target"> ${data}</span>`;
};

const addEmojiElement = (data, visible) => {
    return `<td class="github-line-emoji"><span style="color: ${GITHUB_GRAY}; ${visible ? '' : 'display: none'};" class="css-truncate css-truncate-target">${data}</span></td>`;
};

const inject = (type, pair, visible) => {
    const { row, data } = pair;
    if (type === 'TEXT') {
        const adjacentCell = row.children[1];
        const input = createInput(type, row, data);
        const lineEl = addTextElement(input, visible);
        adjacentCell.insertAdjacentHTML('beforeend', lineEl);
    } else {
        const adjacentCell = row.lastElementChild;
        const input = createInput(type, row, data);
        const lineEl = addEmojiElement(input, visible);
        adjacentCell.insertAdjacentHTML('beforebegin', lineEl);
    }
}

const createInput = (type, row, data) => {
    if (type === 'TEXT') {
        return isDir(row)
            ? `(${displayText('DIR', data)} / ${displayText('FILE', data)})`
            : `(${displayText('LINE', data)})`;
    } else {
        return isDir(row)
            ? `📁 (${data.nums.dirNum})  |  📄 (${data.nums.fileNum})`
            : `📜 ${data.lines} Lines`;
    }
}

const textSelector = '.github-line-text';
const emojiSelector = '.github-line-emoji span'
const toggleAll = (selector) => {
    document.querySelectorAll(selector).forEach(
        el => el.style.display === 'none'
            ? el.style.display = ''
            : el.style.display = 'none'
    )
}

const appendElement = (type, dataPairs, visible) => {
    dataPairs.forEach(pair => {
        inject(type, pair, visible)
    });
};

const render = (type, dataPairs, visible) => setTimeout(() => {
    appendElement(type, dataPairs, visible);
}, LOAD_TIMEOUT);

render('TEXT', dataPairs, true);
render('EMOJI', dataPairs, false);

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.action === 'TOGGLE') {
        toggleAll(textSelector);
        toggleAll(emojiSelector);
        sendResponse({ action: 'DONE' });
    }
});
