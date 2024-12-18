import * as vscode from 'vscode';
import { defaultRange, getDefaultI18nItem, GlobalConfig, I18nMapper, lspLangSelectors } from '../global';
import { makeI18nKeyProfile } from './completion';
import { isValidT } from '../util';

class I18nProvider implements vscode.HoverProvider {
    public provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
        const range = document.getWordRangeAtPosition(position, /\bt\(["'][^"']*["'].*\)/);
        if (!isValidT(range, document)) {
            return undefined;
        }

        const targetExpression = document.getText(range);
        const match = /\bt\(["']([^"']*)["'].*\)/.exec(targetExpression);

        if (match && match[1] !== undefined) {
            const targetI18nKey = match[1];
            
            const i18nItem = getDefaultI18nItem(GlobalConfig, I18nMapper);
            if (!i18nItem) {
                return undefined;
            }
            const originSelectionRange = document.getWordRangeAtPosition(position, /["'][^"']*["']/);

            const targetContent = i18nItem.content[targetI18nKey];
            const profile = makeI18nKeyProfile(targetI18nKey, targetContent);
            const markdown = new vscode.MarkdownString(profile, true);
            const hover = new vscode.Hover(markdown, originSelectionRange);
            return hover;
        }

        return undefined;
    }
}

export function registerHover(context: vscode.ExtensionContext) {
    const provider = new I18nProvider();
    vscode.languages.registerHoverProvider(lspLangSelectors, provider);
}