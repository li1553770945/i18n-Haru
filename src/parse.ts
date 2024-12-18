import * as vscode from 'vscode';
import { parseTree } from 'jsonc-parser';
import * as YAML from 'js-yaml';
import * as fs from 'fs';

interface JsonKeyItem {
    key: string;
    value: string;
    startOffset: number;
    startLength: number;
}

function cleanQuote(text: string): string {
    if (text.startsWith('"') || text.startsWith('\'')) {
        text = text.slice(1);
    }
    if (text.endsWith('"') || text.endsWith('\'')) {
        text = text.slice(0, -1);
    }
    return text;
}

function getKeyPositions(node: any, jsonContent: string): JsonKeyItem[] {
    const keyPositions: JsonKeyItem[] = [];

    for (const property of node.children) {
        if (property.type === 'property') {
            const keyNode = property.children[0];
            const valueNode = property.children[1];

            let key = jsonContent.substring(keyNode.offset, keyNode.offset + keyNode.length);
            let value = jsonContent.substring(valueNode.offset, valueNode.offset + valueNode.length);

            key = cleanQuote(key);
            value = cleanQuote(value);

            const startOffset = keyNode.offset as number;
            const startLength = keyNode.length as number;
            
            
            keyPositions.push({ key, value, startOffset, startLength });
        }
    }

    return keyPositions;
}

export interface ParseResult {
    content: Record<string, string>,
    keyRanges: Map<string, vscode.Range>
}

export async function parseJson(filepath: string): Promise<ParseResult> {
    const content: Record<string, string> = {};
    const keyRanges = new Map<string, vscode.Range>();
    // 构造 每一个 key 的 range，基于 vscode 的 API
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filepath));
    const jsonContent = document.getText();

    const jsonTree = parseTree(jsonContent);
    if (!jsonTree || jsonTree.type !== 'object') {
        vscode.window.showErrorMessage('Failed to parse JSON file or JSON is not a top-level object.');
        return { content, keyRanges };;
    }

    getKeyPositions(jsonTree, jsonContent).forEach(item => {
        content[item.key] = item.value;
        const startPos = document.positionAt(item.startOffset);
        const endPos = document.positionAt(item.startOffset + item.startLength);
        const range = new vscode.Range(startPos, endPos);
        keyRanges.set(item.key, range);
    })

    return { content, keyRanges };
}

export async function parseYaml(filepath: string): Promise<ParseResult> {
    const filecontent = fs.readFileSync(filepath, { encoding: 'utf-8' });
    const content = YAML.load(filecontent) as Record<string, string>;
    const keyRanges = new Map<string, vscode.Range>();
    
    return { content, keyRanges };
}

// 对于特殊字符的转义
export function saveJsonReplacer(key: string, value: any): any {
    if (typeof value === 'string') {
        return value
            .replace(/\\"/g, '"') // 将 \" 替换为 "
            .replace(/\\\\n/g, '\\n') // 将 \\n 替换为 \n
            .replace(/\\\\t/g, '\\t') // 将 \\t 替换为 \t
            .replace(/\\\\r/g, '\\r') // 将 \\r 替换为 \r
            .replace(/\\\\f/g, '\\f') // 将 \\f 替换为 \f
            .replace(/\\\\b/g, '\\b'); // 将 \\b 替换为 \b
    }
    return value;   
}