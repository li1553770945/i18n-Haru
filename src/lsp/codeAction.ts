import * as vscode from 'vscode';
import { JsonSuggest } from './diagnostics';
import { getDefaultI18nItem, GlobalConfig, i18nFileSelectors, I18nTextMap, lspLangSelectors } from '../global';

class I18nJsonProvider implements vscode.CodeActionProvider {
    public async provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): Promise<(vscode.CodeAction | vscode.Command)[] | null | undefined> {
        const fixes: vscode.CodeAction[] = [];
        for (const diag of context.diagnostics) {
            const suggestCode = diag.code;
            if (typeof suggestCode !== 'object') {
                continue;
            }
            
            switch (suggestCode.value) {
                case JsonSuggest.Lack:
                    fixes.push(... await this.provideLackFix(document, diag))
                    break;
                case JsonSuggest.Redundant:
                    fixes.push(...await this.provideRedundantFix(document, diag))
                    break;
                default:
                    break;
            }
        }

        return fixes;
    }

    private async provideLackFix(document: vscode.TextDocument, diagnostic: vscode.Diagnostic): Promise<vscode.CodeAction[]> {
        const fixes: vscode.CodeAction[] = [];
        const { t } = vscode.l10n;
        if (typeof diagnostic.code !== 'object') {
            return fixes;
        }
        const uri = diagnostic.code.target;
        const filepath = uri.fsPath;

        if (!filepath.endsWith('.json')) {
            return fixes;
        }
        const items = [];
        for (const [_, item] of I18nTextMap.entries()) {
            if (item.file === filepath) {
                items.push(item);
                break;
            }
        }

        if (items.length === 0) {
            return fixes;
        }

        const targetI18n = items[0];
        const i18nItem = getDefaultI18nItem();
        if (i18nItem === undefined) {
            vscode.window.showErrorMessage(t('error.command.add-token.cannot-get-default-i18n-item'));
            return fixes;
        }

        const currentKeys = new Set(Object.keys(targetI18n.content));
        const correctJson: Record<string, string> = {};

        for (const i18nToken of Object.keys(i18nItem.content)) {
            if (currentKeys.has(i18nToken)) {
                const text = targetI18n.content[i18nToken];
                correctJson[i18nToken] = text;
            } else {
                const text = i18nItem.content[i18nToken];
                correctJson[i18nToken] = text;
            }
        }

        const currentFix = new vscode.CodeAction(
            t('info.lsp.code-action.use-main-for-current-supply'),
            vscode.CodeActionKind.QuickFix
        );

        const currentEdit = new vscode.WorkspaceEdit();
        currentEdit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), JSON.stringify(correctJson, null, '    '));
        currentFix.edit = currentEdit;
        fixes.push(currentFix);

        const allFix = new vscode.CodeAction(
            t('info.lsp.code-action.use-main-for-all-supply'),
            vscode.CodeActionKind.QuickFix
        ); 

        const allEdit = new vscode.WorkspaceEdit();
        for (const [code, item] of I18nTextMap.entries()) {
            if (code === GlobalConfig.main) {
                continue;
            }
            const uri = vscode.Uri.file(item.file);
            if (uri.fsPath === document.uri.fsPath) {
                allEdit.replace(uri, new vscode.Range(0, 0, document.lineCount, 0), JSON.stringify(correctJson, null, '    '));
            } else {
                const doc = await vscode.workspace.openTextDocument(uri);
                // 计算当前的 correctJson
                const correctJson: Record<string, string> = {};
                const currentKeys = new Set(Object.keys(item.content));
                for (const i18nToken of Object.keys(i18nItem.content)) {
                    if (currentKeys.has(i18nToken)) {
                        const text = targetI18n.content[i18nToken];
                        correctJson[i18nToken] = text;
                    } else {
                        const text = i18nItem.content[i18nToken];
                        correctJson[i18nToken] = text;
                    }
                }
                allEdit.replace(uri, new vscode.Range(0, 0, doc.lineCount, 0), JSON.stringify(correctJson, null, '    '));
            }
        }

        allFix.edit = allEdit;
        fixes.push(allFix);

        return fixes;
    }

    // TODO: 解决屎山代码 
    private async provideRedundantFix(document: vscode.TextDocument, diagnostic: vscode.Diagnostic): Promise<vscode.CodeAction[]> {
        const fixes: vscode.CodeAction[] = [];
        const { t } = vscode.l10n;
        if (typeof diagnostic.code !== 'object') {
            return fixes;
        }
        const uri = diagnostic.code.target;
        const filepath = uri.fsPath;

        if (!filepath.endsWith('.json')) {
            return fixes;
        }
        const items = [];
        for (const [_, item] of I18nTextMap.entries()) {
            if (item.file === filepath) {
                items.push(item);
                break;
            }
        }

        if (items.length === 0) {
            return fixes;
        }

        const targetI18n = items[0];
        const i18nItem = getDefaultI18nItem();
        if (i18nItem === undefined) {
            vscode.window.showErrorMessage(t('error.command.add-token.cannot-get-default-i18n-item'));
            return fixes;
        }

        const currentKeys = new Set(Object.keys(targetI18n.content));
        const correctJson: Record<string, string> = {};

        for (const i18nToken of Object.keys(i18nItem.content)) {
            if (currentKeys.has(i18nToken)) {
                const text = targetI18n.content[i18nToken];
                correctJson[i18nToken] = text;
            } else {
                const text = i18nItem.content[i18nToken];
                correctJson[i18nToken] = text;
            }
        }

        const currentFix = new vscode.CodeAction(
            t('info.lsp.code-action.use-main-for-current-supply'),
            vscode.CodeActionKind.QuickFix
        );

        const currentEdit = new vscode.WorkspaceEdit();
        currentEdit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), JSON.stringify(correctJson, null, '    '));
        currentFix.edit = currentEdit;
        fixes.push(currentFix);

        const allFix = new vscode.CodeAction(
            t('info.lsp.code-action.use-main-for-all-supply'),
            vscode.CodeActionKind.QuickFix
        ); 

        const allEdit = new vscode.WorkspaceEdit();
        for (const [code, item] of I18nTextMap.entries()) {
            if (code === GlobalConfig.main) {
                continue;
            }
            const uri = vscode.Uri.file(item.file);
            if (uri.fsPath === document.uri.fsPath) {
                allEdit.replace(uri, new vscode.Range(0, 0, document.lineCount, 0), JSON.stringify(correctJson, null, '    '));
            } else {
                const doc = await vscode.workspace.openTextDocument(uri);
                // 计算当前的 correctJson
                const correctJson: Record<string, string> = {};
                const currentKeys = new Set(Object.keys(item.content));
                for (const i18nToken of Object.keys(i18nItem.content)) {
                    if (currentKeys.has(i18nToken)) {
                        const text = targetI18n.content[i18nToken];
                        correctJson[i18nToken] = text;
                    } else {
                        const text = i18nItem.content[i18nToken];
                        correctJson[i18nToken] = text;
                    }
                }
                allEdit.replace(uri, new vscode.Range(0, 0, doc.lineCount, 0), JSON.stringify(correctJson, null, '    '));
            }
        }

        allFix.edit = allEdit;
        fixes.push(allFix);

        return fixes;
    }
}

export function registerCodeAction(context: vscode.ExtensionContext) {
    const provider = new I18nJsonProvider();
    vscode.languages.registerCodeActionsProvider(i18nFileSelectors, provider);
}