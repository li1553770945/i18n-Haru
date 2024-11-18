import * as vscode from 'vscode';
import { currentTranslation, getDefaultI18nItem, I18nTextMap, updateAll } from './global';
import * as fs from 'fs';
import * as path from 'path';

import { franc } from 'franc';
import * as langs from 'langs';

const { t } = vscode.l10n;

export function detectLanguageISO(text: string): string {
    // 使用 franc 检测语言
    const languageCode = franc(text);

    // 如果检测到的语言代码为 'und'，表示无法确定语言
    if (languageCode === 'und') {
        return 'unknown';
    }

    // 使用 langs 获取 ISO 639-3 编码
    const language = langs.where('2', languageCode);

    if (language === undefined) {
        return 'unknown';
    }

    // 返回 ISO 639-3 编码
    return language[1] || 'unknown';
}


export async function extractUnfinishedItems(context: vscode.ExtensionContext, uri: vscode.Uri) {
    const i18nItem = findI18nItemByUri(uri);
    if (i18nItem) {
        // const unfinished = await vscode.window.withProgress({
        //     location: vscode.ProgressLocation.Notification,
        //     title: t('info.command.extract.get-unfinished-message.title')
        // }, async () => {
        //     const unfinished: Record<string, string> = {};
        //     for (const message of Object.keys(i18nItem.content)) {
        //         const messageContent = i18nItem.content[message] as string;

        //         // 当前的句子是否和当前的文件的 code 代表同一个语言
        //         let charWiseSame = false;
        //         for (const char of messageContent) {
        //             const code = detectLanguageISO(char);
        //             if (code === i18nItem.code) {
        //                 charWiseSame = true;
        //                 break;
        //             }
        //         }
        //         if (!charWiseSame) {
        //             charWiseSame = detectLanguageISO(messageContent) === i18nItem.code;
        //         }

        //         // 如果不是同一个语言，则需要翻译
        //         if (!charWiseSame) {
        //             console.log(message, messageContent, detectLanguageISO(messageContent));
        //             unfinished[message] = messageContent;
        //         }
        //     }
        //     return unfinished;
        // });


        // 创建一个临时的编辑器用于生成
        const tmpChangePath = path.join(context.extensionPath, 'i18n-Haru.json');
        fs.writeFileSync(tmpChangePath, '');
        const implChangeDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(tmpChangePath));
        await vscode.window.showTextDocument(implChangeDocument, {
            preview: false,
            viewColumn: vscode.ViewColumn.Beside
        });
        currentTranslation.implChangeDocument = implChangeDocument;
        currentTranslation.code = i18nItem.code;

    } else {
        vscode.window.showErrorMessage(t('error.command.extract.not-i18n-bundle'));
    }
}

function makeTranslationPrompt(code: string, unfinished: Record<string, string>) {
    const prompt = t('info.command.extract.translate-prompt', code) + '\n\n' + JSON.stringify(unfinished, null, '  ');
    return prompt;
}


function findI18nItemByUri(uri: vscode.Uri) {
    // 先找到 uri 对应的 i18n item
    for (const item of I18nTextMap.values()) {
        if (item.file === uri.fsPath) {
            return item;
        }
    }
    return undefined;
}


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
    if (prevChar === ' ' || prevChar === '$') {
        return true;
    }

    const prePos = new vscode.Position(start.line, start.character);
    const preRange = document.getWordRangeAtPosition(prePos, /[a-zA-Z_][a-zA-Z0-9_]*/);
    
    if (!preRange) {
        return false;
    }
    const preWord = document.getText(preRange);    
    return preWord === 't';
}


export async function implChange(uri: vscode.Uri) {
    if (currentTranslation.code === '') {
        return;
    }
    // 将当前临时文件内的玩意儿覆盖进 i18n 文件
    const i18nItem = I18nTextMap.get(currentTranslation.code);
    if (!i18nItem) {
        return;
    }
    
    if (currentTranslation.implChangeDocument) {
        const text = currentTranslation.implChangeDocument.getText();
        try {
            const json = JSON.parse(text) as Record<string, string>;
            for (const message of Object.keys(json)) {
                const translation = json[message] as string;
                i18nItem.content[message] = translation;
            }
            fs.writeFileSync(i18nItem.file, JSON.stringify(i18nItem.content, null, '  '));
        } catch (error) {
            vscode.window.showErrorMessage(t('error.command.impl-change.parse-json', `${error}`));
        }


        await vscode.window.showTextDocument(currentTranslation.implChangeDocument);
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    }

    currentTranslation.code = '';
}