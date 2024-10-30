import * as vscode from 'vscode';
import { getDefaultI18nItem, I18nTextMap, updateAll } from './global';
import * as fs from 'fs';
import path = require('path');

export async function addI18nToken(context: vscode.ExtensionContext) {
    const { t } = vscode.l10n;
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return; // 如果没有活动编辑器，则返回
    }

    const i18nItem = getDefaultI18nItem();
    if (!i18nItem) {
        vscode.window.showErrorMessage(t('error.command.add-token.cannot-get-default-i18n-item'));
        return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);

    // 获取选区的开始和结束位置
    const startPosition = selection.start;
    const endPosition = selection.end;

    // 检查选区的左侧和右侧是否存在引号
    const startLine = editor.document.lineAt(startPosition.line).text;
    const endLine = editor.document.lineAt(endPosition.line).text;

    const startQuote = findQuote(startLine, startPosition.character - 1, -1);
    const endQuote = findQuote(endLine, endPosition.character, 1);

    console.log(startQuote);
    console.log(endQuote);    

    if (startQuote && endQuote) {
        // 扩展选区到引号的区域
        const newSelection = new vscode.Selection(
            startPosition.line, startQuote.index,
            endPosition.line, endQuote.index + 1
        );
        editor.selection = newSelection;
    }

    if (selectedText.length > 0) {
        const tokeName = await vscode.window.showInputBox({
            title: t('info.command.add-token.title'),
            placeHolder: 'level.module.name.[component]'
        });
        if (tokeName) {
            // 检验是否重复
            const allKeys = new Set(Object.keys(i18nItem.content));
            if (allKeys.has(tokeName)) {
                vscode.window.showErrorMessage(t('error.command.add-token.repeat-i18n-token'));
                return;
            }

            // 加载，写入，重新解析
            for (const [code, item] of I18nTextMap.entries()) {
                item.content[tokeName] = selectedText;
                fs.writeFileSync(item.file, JSON.stringify(item.content, null, '    '));
            }

            await updateAll();

            const quote = vscode.workspace.getConfiguration('i18n-haru').get('t-quote') || '\'';
            editor.edit(builder => builder.replace(editor.selection, `t(${quote}${tokeName}${quote})`))
        }
    }
}

interface QuotePosition {
    index: number;
    quote: string;
}


function findQuote(line: string, start: number, direction: number): QuotePosition | null {
    const quotes = ['"', "'"];
    let index = start;

    while (index >= 0 && index < line.length) {
        const char = line[index];
        if (quotes.includes(char)) {
            return { index, quote: char };
        }
        index += direction;
    }

    return null;
}

export interface CustomIconPath {
    light: vscode.Uri
    dark: vscode.Uri
} 

export function getIconPath(context: vscode.ExtensionContext, name: string): CustomIconPath {
    const iconRoot = context.asAbsolutePath('icons');
    return {
        dark: vscode.Uri.file(path.join(iconRoot, 'dark', name + '.svg')),
        light: vscode.Uri.file(path.join(iconRoot, 'light', name + '.svg'))
    };
}

interface I18nQuickItem extends vscode.QuickPickItem {
    token: string
}

export async function deleteI18nToken(context: vscode.ExtensionContext) {
    const { t } = vscode.l10n;
    const i18nItem = getDefaultI18nItem();
    if (!i18nItem) {
        vscode.window.showErrorMessage(t('error.command.add-token.cannot-get-default-i18n-item'));
        return;
    }

    const quickItems: I18nQuickItem[] = [];
    for (const token of Object.keys(i18nItem.content)) {
        let content = i18nItem.content[token];
        quickItems.push({
            label: '$(i18n-icon) ' + token,
            token: token,
            detail: content
        });
    }

    const res = await vscode.window.showQuickPick(quickItems, {
        title: t('info.command.delete-token.title'),
        placeHolder: t('info.command.delete-token.placeholder')
    });
    
    if (res !== undefined) {
        for (const [_, item] of I18nTextMap.entries()) {
            delete item.content[res.token];
            fs.writeFileSync(item.file, JSON.stringify(item.content, null, '    '));
        }
    }
}

export function isValidT(range: vscode.Range | undefined, document: vscode.TextDocument): boolean {
    if (range === undefined) {
        return false;
    }
    const start = range.start;
    if (start.character === 0) {
        return true;
    }
    const prevChar = document.lineAt(start.line).text[start.character - 1];
    return prevChar === ' ' || prevChar === '$';
}