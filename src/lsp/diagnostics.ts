import * as vscode from 'vscode';
import { defaultRange, getDefaultI18nItem, GlobalConfig, I18nTextMap } from '../global';

export enum JsonSuggest {
    Lack,
    Redundant
};

class I18nJsonDiagnostic {
    diagnostic: vscode.DiagnosticCollection;
    constructor() {
        this.diagnostic = vscode.languages.createDiagnosticCollection();
    }

    async lint(filepath: string) {
        if (!filepath.endsWith('.json') || !filepath.startsWith(GlobalConfig.root)) {
            return;
        }
        const items = [];
        for (const [_, item] of I18nTextMap.entries()) {
            if (item.file === filepath) {
                items.push(item);
                break;
            }
        }

        if (items.length === 0) {
            return;
        }

        const targetI18n = items[0];
        const { t } = vscode.l10n;
        const i18nItem = getDefaultI18nItem();
        if (i18nItem === undefined) {
            vscode.window.showErrorMessage(t('error.command.add-token.cannot-get-default-i18n-item'));
            return;
        }

        const baseKeys = new Set(Object.keys(i18nItem.content));
        const suggests: vscode.Diagnostic[] = [];

        const uri = vscode.Uri.file(filepath);
        
        for (const i18nToken of Object.keys(targetI18n.content)) {
            const tokenRange = targetI18n.keyRanges.get(i18nToken) || defaultRange;
            if (baseKeys.has(i18nToken)) {
                baseKeys.delete(i18nToken);
            } else {
                // 此处是多余的 token
                const hintMessage = t('info.lsp.linter.redundant-token');
                const diagnostic = new vscode.Diagnostic(tokenRange, hintMessage, vscode.DiagnosticSeverity.Information);
                diagnostic.code = {
                    value: JsonSuggest.Redundant,
                    target: uri
                };
                suggests.push(diagnostic);
            }
        }

        if (baseKeys.size > 0) {
            // 剩下的这些 token 都是缺失的
            const lackedKeys = [...baseKeys];
            const errorMessage = `${t("info.lsp.linter.lacked-token")}\n${lackedKeys.join("\n")}`;
            const document = await vscode.workspace.openTextDocument(uri);
            const errorRange = new vscode.Range(document.lineCount - 1, 0, document.lineCount, 0);
            const diagnostic = new vscode.Diagnostic(errorRange, errorMessage, vscode.DiagnosticSeverity.Error);
            diagnostic.code = {
                value: JsonSuggest.Lack,
                target: uri
            };
            suggests.push(diagnostic);
        }

        this.diagnostic.set(vscode.Uri.file(filepath), suggests);
    }
}

export const jsonSuggestor = new I18nJsonDiagnostic();