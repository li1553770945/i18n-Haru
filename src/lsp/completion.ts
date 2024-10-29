import * as vscode from 'vscode';
import { defaultRange, getDefaultI18nItem, I18nTextMap, lspLangSelectors } from '../global';

class I18nProvider implements vscode.CompletionItemProvider {
    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>> {
        const range = document.getWordRangeAtPosition(position, /t\(["'][^"']*["']\)/);
        if (range === undefined) {
            return [];
        }

        const items: vscode.CompletionItem[] = [];
        const targetExpression = document.getText(range);
        const match = /t\(["']([^"']*)["']\)/.exec(targetExpression);
        
        if (match && match[1] !== undefined) {
            const targetI18nKey = match[1];
            const i18nItem = getDefaultI18nItem();
            if (!i18nItem) {
                return items;
            }
            
            const { t } = vscode.l10n;
            for (const i18nKey of Object.keys(i18nItem.content)) {
                if (!i18nKey.startsWith(targetI18nKey)) {
                    continue;
                }
                const profile = makeI18nKeyProfile(i18nKey);
                const markdown = new vscode.MarkdownString(profile, true);
                const completionItem: vscode.CompletionItem = {
                    label: i18nKey,
                    kind: vscode.CompletionItemKind.Value,
                    detail: t('info.lsp.detail.key'),
                    documentation: markdown
                };
                items.push(completionItem);
            }
        }

        return items;
    }
}

export function makeI18nKeyProfile(i18nKey: string): string {
    const { t } = vscode.l10n;
    let profile = '```json\n"' + i18nKey + '"\n```\n---\n';
    for (const [langCode, item] of I18nTextMap.entries()) {
        let content = item.content[i18nKey];
        const uri = vscode.Uri.file(item.file);
        const range = item.keyRanges.get(i18nKey) || defaultRange;
        let gotoDefinition = `[${t('info.lsp.common.goto-definition')}](${uri}#L${range.start.line + 1}:${range.start.character + 1})`;
        if (content === undefined) {
            content = t('info.lsp.common.undefined');
        } else if (content.trim().length === 0) {
            content = t('info.lsp.common.empty');
        } else {
            content = '```plaintext\n' + content.trim() + '\n```';
        }

        profile += `#### $(globe) ${langCode} \t $(search) ${gotoDefinition}\n${content}\n`;
    }
    return profile;
}

export function registerCompletions(context: vscode.ExtensionContext) {
    const provider = new I18nProvider();
    vscode.languages.registerCompletionItemProvider(lspLangSelectors, provider);
    vscode.languages.registerCompletionItemProvider(lspLangSelectors, provider, '\'');
    vscode.languages.registerCompletionItemProvider(lspLangSelectors, provider, '\"');
}