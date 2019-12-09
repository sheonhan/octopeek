export interface FileData {
    type: string;
    lines: number | string;
}

export interface DirData {
    type: string;
    nums: {
        dirNum: number;
        fileNum: number;
    };
}

export type Data = DirData | FileData;

export interface Row {
    row: Element;
    link: string;
}

export interface NodeMap {
    [key: number]: Element;
}

export interface DataPair {
    row: Element;
    data: Data;
}
