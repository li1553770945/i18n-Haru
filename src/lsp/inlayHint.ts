import * as vscode from 'vscode';
import { getDefaultI18nItem, I18nTextItem, lspLangSelectors } from '../global';
import { makeI18nKeyProfile } from './completion';
import { isValidT } from '../util';

class I18nProvider implements vscode.InlayHintsProvider {
    public provideInlayHints(document: vscode.TextDocument, range: vscode.Range, token: vscode.CancellationToken): vscode.ProviderResult<vscode.InlayHint[]> {
        // 优化一下，直接解析激活视图可见区域的部分
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor || activeEditor.document.uri.fsPath !== document.uri.fsPath) {
            return undefined;
        }
        
        const visibleRange = activeEditor.visibleRanges[0];
        const inlayHints: vscode.InlayHint[] = [];
        const i18nItem = getDefaultI18nItem();
        if (!i18nItem) {
            return undefined;
        }
        for (let line = visibleRange.start.line; line <= visibleRange.end.line; ++ line) {
            const lineText = document.lineAt(line).text;
            const maxHintLength = vscode.workspace.getConfiguration('i18n-haru').get<number>('line-hint-max-length') || 10;
            if (lineText.length > 0) {
                const hint = makeLineTextHint(document, line, lineText, i18nItem, maxHintLength);
                inlayHints.push(...hint);
            }
        }

        return inlayHints;
    }
}


interface MatchResult {
    match: string;
    column: number;
}

function findMatchingStrings(
    document: vscode.TextDocument,
    line: number,
    lineText: string
): MatchResult[] {

    const regex = /t\(["']([^"']*)["']\)/g;
    const matches: MatchResult[] = [];
    let match;
    
    while ((match = regex.exec(lineText)) !== null) {        
        const matchString = match[0];
        const start = new vscode.Position(line, match.index);
        const range = new vscode.Range(start, start);
        if (!isValidT(range, document)) {
            continue;
        }
        
        let lastQIndex = matchString.lastIndexOf('"');
        if (lastQIndex === -1) {
            lastQIndex = matchString.lastIndexOf('\'');
        }

        const i18nStringMatch = /t\(["']([^"']*)["']\)/.exec(matchString);
        if (i18nStringMatch && i18nStringMatch[1] !== undefined && lastQIndex !== -1) {
            const column = match.index + lastQIndex + 1;            
            matches.push({ match: i18nStringMatch[1], column });
        }
    }

    return matches;
}

function makeLineTextHint(
    document: vscode.TextDocument,
    line: number,
    lineText: string,
    i18nItem: I18nTextItem,
    maxHintLength: number
): vscode.InlayHint[] {
    const { t } = vscode.l10n;

    const hints: vscode.InlayHint[] = [];
    const matches = findMatchingStrings(document, line, lineText);
    
    for (const match of matches) {
        const targetI18nKey = match.match;
        let content = i18nItem.content[targetI18nKey];
        
        if (content === undefined) {
            content = t('info.lsp.common.undefined');
        } else if (content.trim().length === 0) {
            content = t('info.lsp.common.empty');
        } else {
            content = content.trim();
        }

        if (content.length > maxHintLength) {
            content = content.slice(0, maxHintLength) + '...';
        }

        const pos = new vscode.Position(line, match.column);
        const hint = new vscode.InlayHint(pos, content, vscode.InlayHintKind.Type);
        const profile = makeI18nKeyProfile(targetI18nKey);
        const markdown = new vscode.MarkdownString(profile, true);
        hint.tooltip = markdown;
        hint.paddingLeft = true;
        hint.paddingRight = true;
        hints.push(hint);
    }

    return hints;
}


export function registerInlayHints(context: vscode.ExtensionContext) {
    const provider = new I18nProvider();
    vscode.languages.registerInlayHintsProvider(lspLangSelectors, provider);
}