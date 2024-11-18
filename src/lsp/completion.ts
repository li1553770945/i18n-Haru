import * as vscode from 'vscode';
import { defaultRange, getDefaultI18nItem, I18nTextMap, lspLangSelectors } from '../global';
import { isValidT } from '../util';

class I18nProvider implements vscode.CompletionItemProvider {
    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>> {
        const range = document.getWordRangeAtPosition(position, /t\(["'][^"']*["'].*\)/);
        if (range === undefined || !isValidT(range, document)) {
            return [];
        }

        const items: vscode.CompletionItem[] = [];
        const targetExpression = document.getText(range);
        const match = /t\(["']([^"']*)["'](.*)\)/.exec(targetExpression);

        if (match && match[1] !== undefined) {
            const targetI18nKey = match[1];
            const i18nItem = getDefaultI18nItem();
            if (!i18nItem) {
                return items;
            }
            
            const { t } = vscode.l10n;
            const insertRange = new vscode.Range(
                new vscode.Position(range.start.line, range.start.character + 3),
                new vscode.Position(range.end.line, range.end.character - 2 - match[2].length)
            );

            for (const i18nKey of Object.keys(i18nItem.content)) {
                if (!i18nKey.startsWith(targetI18nKey)) {
                    continue;
                }

                const targetContent = i18nItem.content[i18nKey];
                const profile = makeI18nKeyProfile(i18nKey, targetContent);
                const markdown = new vscode.MarkdownString(profile, true);

                const completionItem: vscode.CompletionItem = {
                    label: i18nKey,
                    kind: vscode.CompletionItemKind.Value,
                    detail: t('info.lsp.detail.key'),
                    documentation: markdown,
                    range: insertRange
                };
                items.push(completionItem);
            }
        }

        return items;
    }
}


class I18nAllProvider implements vscode.CompletionItemProvider {
    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>> {
        const range = document.getWordRangeAtPosition(position, /t\(*\)/);
        if (!isValidT(range, document)) {
            return [];
        }

        const items: vscode.CompletionItem[] = [];
        
        const targetI18nKey = '';
        const i18nItem = getDefaultI18nItem();
        if (!i18nItem) {
            return items;
        }
        
        const { t } = vscode.l10n;
        for (const i18nKey of Object.keys(i18nItem.content)) {
            if (!i18nKey.startsWith(targetI18nKey)) {
                continue;
            }
            const targetContent = i18nItem.content[i18nKey];
            const profile = makeI18nKeyProfile(i18nKey, targetContent);
            const markdown = new vscode.MarkdownString(profile, true);
            const completionItem: vscode.CompletionItem = {
                label: '"' + i18nKey + '"',
                kind: vscode.CompletionItemKind.Value,
                detail: t('info.lsp.detail.key'),
                documentation: markdown
            };
            items.push(completionItem);
        }

        return items;
    }
}

export function makeI18nKeyProfile(i18nKey: string, targetContent: string): string {
    const { t } = vscode.l10n;
    let profileContent = '';

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

        profileContent += `#### $(globe) ${langCode} \t $(search) ${gotoDefinition}\n${content}\n`;
    }

    /// 支持含参数的 i18n 提醒
    /// 无名参数 i18n
    /// "nice-dinner": "今天我们去了 {0} 吃了 {1} 这道菜，味道好极了"
    /// 调用方式： t("nice-dinner", name, meanlName);
    /// 具名参数 i18n
    /// "nice-dinner": "今天我们去了 {name} 吃了 {meanlName} 这道菜，味道好极了"
    /// 调用方式： t("nice-dinner", { name, meanlName });
    /// 混合使用也是可以的：具体要看 i18n 框架是如何支持的
    let profile = '### I18n Key\n';
    const regex = /\{(.*?)\}/g;
    const unnamedParams = [];
    const namedParams = [];
    
    for (const match of targetContent.match(regex) || []) {
        const paramName = match.slice(1, -1);
        if (!isNaN(parseInt(paramName))) {
            const unameId = parseInt(paramName);
            unnamedParams.push({
                id: unameId
            });
        } else {
            namedParams.push({
                name: paramName
            });
        }
    }

    if (unnamedParams.length === 0 && namedParams.length === 0) {
        profile += '```js\nt("' + i18nKey + '")\n```\n---\n';
    } else {
        const tList: string[] = ['"' + i18nKey + '"'];
        unnamedParams.forEach(param => tList.push('arg' + param.id));
        if (namedParams.length > 0) {
            const nameParamString = `{ ${namedParams.map(param => param.name).join(', ')} }`
            tList.push(nameParamString);
        }
        profile += '```js\nt(' + tList.join(', ') + ')\n```\n';
        profile += t('info.lsp.common.params-contain-info', unnamedParams.length, namedParams.length) + '\n\n---\n';
    }

    return profile + profileContent;
}

export function registerCompletions(context: vscode.ExtensionContext) {
    const provider = new I18nProvider();
    vscode.languages.registerCompletionItemProvider(lspLangSelectors, provider);
    vscode.languages.registerCompletionItemProvider(lspLangSelectors, provider, '\'');
    vscode.languages.registerCompletionItemProvider(lspLangSelectors, provider, '\"');
    vscode.languages.registerCompletionItemProvider(lspLangSelectors, provider, '.');

    const allProvider = new I18nAllProvider();
    vscode.languages.registerCompletionItemProvider(lspLangSelectors, allProvider, '(');
}