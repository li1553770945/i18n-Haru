import * as vscode from 'vscode';
import { getDefaultI18nItem, I18nTextMap, updateAll } from './global';
import * as fs from 'fs';

export async function AddI18nToken() {
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
        }
    }
}