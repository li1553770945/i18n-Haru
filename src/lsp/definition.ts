import * as vscode from 'vscode';
import { defaultRange, getDefaultI18nItem, lspLangSelectors } from '../global';
import { isValidT } from '../util';

class I18nProvider implements vscode.DefinitionProvider {
    public provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Definition | vscode.DefinitionLink[]> {
        const range = document.getWordRangeAtPosition(position, /\bt\(["'][^"']*["'].*\)/);
        if (!isValidT(range, document)) {
            return [];
        }


        const targetExpression = document.getText(range);
        const match = /\bt\(["']([^"']*)["'].*\)/.exec(targetExpression);

        const links: vscode.DefinitionLink[] = [];
        if (match && match[1] !== undefined) {
            const targetI18nKey = match[1];
            
            const i18nItem = getDefaultI18nItem();
            if (!i18nItem) {
                return links;
            }

            const originSelectionRange = document.getWordRangeAtPosition(position, /["'][^"']*["']/);

            const link: vscode.DefinitionLink = {
                originSelectionRange,
                targetUri: vscode.Uri.file(i18nItem.file),
                targetRange: i18nItem.keyRanges.get(targetI18nKey) || defaultRange
            };

            links.push(link);
        }

        return links;
    }
}

export function registerDefinition(context: vscode.ExtensionContext) {
    const provider = new I18nProvider();
    vscode.languages.registerDefinitionProvider(lspLangSelectors, provider);
}