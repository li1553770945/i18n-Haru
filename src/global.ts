import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'js-yaml';
import { ISOCodeArray } from './i18n';
import { parseJson, ParseResult, parseYaml } from './parse';
import { OutgoingMessage } from 'http';
import { jsonSuggestor } from './lsp/diagnostics';

type IParseMode = 'json' | 'yaml'
export const defaultRange = new vscode.Range(
    new vscode.Position(0, 0),
    new vscode.Position(0, 0)
);

interface IGlobalConfig {
    root: string,
    main: string,
    display: string,
    parseMode: IParseMode
}

export const GlobalConfig: IGlobalConfig = {
    root: 'i18n',
    main: 'zh-cn',
    display: '',
    parseMode: 'json'
};

// 这里没有设计为 Map 是为了 JSON 的序列化和反序列化更加方便
type I18nText = Record<string, string>;

export interface I18nTextItem {
    file: string,
    code: string,
    content: I18nText,
    keyRanges: Map<string, vscode.Range>
}

export const I18nTextMap: Map<string, I18nTextItem> = new Map();

export async function updateAll() {
    const i18nSetting = vscode.workspace.getConfiguration('i18n-haru');
    let root = i18nSetting.get<string>('root', 'i18n');

    if (!path.isAbsolute(root) && vscode.workspace.workspaceFolders) {
        const workspacePath = vscode.workspace.workspaceFolders[0];
        root = path.resolve(workspacePath.uri.fsPath, root);
    } 

    GlobalConfig.root = root;
    let main = i18nSetting.get<string>('main') || 'zh-cn';
    
    if (main.toLowerCase() === 'zh') {
        main = 'zh-cn';
    }

    GlobalConfig.main = main.toLowerCase();

    let display = i18nSetting.get<string>('display') || '';
    if (display.length === 0) {
        display = main;
    }
    GlobalConfig.display = display;
    GlobalConfig.parseMode = i18nSetting.get<IParseMode>('lang') || 'json';

    await updateI18nFromRoot();
}

export async function initialise(context: vscode.ExtensionContext) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const { t } = vscode.l10n;

    if (workspaceFolders) {
        const workspaceFolder = workspaceFolders[0];
        const settingPath = path.join(workspaceFolder.uri.fsPath, '.vscode', 'settings.json');
        if (!fs.existsSync(settingPath)) {
            fs.writeFileSync(settingPath, JSON.stringify({}, null, '    '));
        }

        await updateAll();

        // 初始化 诊断器
        for (const [_, item] of I18nTextMap.entries()) {
            await jsonSuggestor.lint(item.file);
        }

        // 配置文件发生变化时
        vscode.workspace.onDidChangeConfiguration(async event => {
            if (event.affectsConfiguration('i18n-haru')) {
                await updateAll();
            }
        });

        // 重命名
        vscode.workspace.onDidRenameFiles(async event => {
            const newEvent = { files: event.files.map(file => file.oldUri) };
            const i18nRootFiles = getI18nFilesFromEvent(newEvent);
            if (i18nRootFiles.length > 0) {
                await updateAll();
            }
        });

        // i18n 文件发生新增时
        vscode.workspace.onDidCreateFiles(async event => {
            const i18nRootFiles = getI18nFilesFromEvent(event);
            if (i18nRootFiles.length === 0) {
                return;
            }

            const i18nFiles: string[] = [];
            const parseSuffixs = getParseSuffix();

            for (const file of fs.readdirSync(GlobalConfig.root)) {
                let extname = file.split('.').at(-1);
                if (extname === undefined) {
                    continue;
                }
                if (parseSuffixs !== undefined && !parseSuffixs.includes(extname.toLowerCase())) {
                    continue;   
                }
                i18nFiles.push(file);
            }

            // 去除公共前缀和后缀
            const prefix = await vscode.window.withProgress({
                title: t('info.update-i18n.make-prefix.title'),
                location: vscode.ProgressLocation.Window
            }, async (progress: vscode.Progress<{ message: string, increment: number }>, token: vscode.CancellationToken) => {
                return longestCommonPrefix(i18nFiles);
            });

            for (const file of i18nRootFiles) {
                const filename = path.basename(file);
                const i18nTextItem = await makeI18nTextItem(filename, prefix);
                if (i18nTextItem) {
                    I18nTextMap.set(i18nTextItem.code, i18nTextItem);
                }
            }
        });

        // i18n 文件删除时
        vscode.workspace.onDidDeleteFiles(async event => {
            const i18nRootFiles = getI18nFilesFromEvent(event);

            if (i18nRootFiles.length === 0) {
                return;
            }

            const i18nRootFilesSet = new Set<string>(i18nRootFiles);

            const deleteCodes = [];
            for (const [code, item] of I18nTextMap.entries()) {
                if (i18nRootFilesSet.has(item.file)) {
                    deleteCodes.push(code);
                }
            }
            deleteCodes.forEach(code => I18nTextMap.delete(code));
        });

        // i18n 文件发生变化时，暂时不考虑 rename 的问题
        vscode.workspace.onDidChangeTextDocument(async event => {
            const filePath = event.document.uri.fsPath;
            if (filePath.startsWith(GlobalConfig.root)) {
                const extname = path.extname(filePath).slice(1).toLowerCase();
                const parseSuffixs = getParseSuffix();
                if (parseSuffixs !== undefined && !parseSuffixs.includes(extname)) {
                    return;
                }
                // 在已有的数据结构中找到和这个路径一致的 item
                // 因为 i18n 文件数量绝对不会超过1000，所以直接 for 循环几乎不影响性能
                const items = [];
                for (const item of I18nTextMap.values()) {
                    if (item.file === filePath) {
                        items.push(item);
                        break;
                    }
                }

                const res = await parseFileByParseMode(filePath);
                
                if (items.length > 0 && res) {
                    const code = items[0].code;
                    I18nTextMap.set(code, {
                        code,
                        file: filePath,
                        content: res.content,
                        keyRanges: res.keyRanges
                    });
                    
                    // 诊断
                    if (code === GlobalConfig.main) {
                        // 主语言需要刷新所有的 code
                        for (const [_, item] of I18nTextMap.entries()) {
                            await jsonSuggestor.lint(item.file);
                        }
                    } else {
                        // 非主语言只需要刷新自己
                        await jsonSuggestor.lint(filePath);
                    }
                }
            }
        });

        // 打开文件
        vscode.workspace.onDidOpenTextDocument(async document => {
            const filepath = document.uri.fsPath;
            if (filepath.startsWith(GlobalConfig.root)) {
                await jsonSuggestor.lint(filepath);
            }
        });

        // 切换活动区域
        vscode.window.onDidChangeActiveTextEditor(async editor => {
            if (editor?.document) {
                const filepath = editor.document.uri.fsPath;
                if (filepath.startsWith(GlobalConfig.root)) {
                    await jsonSuggestor.lint(filepath);
                }
            }
        })
    }
}

export async function configureI18nFolder(context: vscode.ExtensionContext) {
    const { t } = vscode.l10n;
    const res = await vscode.window.showOpenDialog({
        title: t('info.configure-i18n-folder.configure.title'),
        openLabel: t('info.configure-i18n-folder.configure.button'),
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false
    });

    if (!res) {
        return;
    }

    const targetFolder = res[0].fsPath;
    if (fs.existsSync(targetFolder)) {
        GlobalConfig.root = targetFolder;
        updateI18nFromRoot();
    }
}



async function parseFileByParseMode(filepath: string): Promise<ParseResult | undefined> {
    const filecontent = fs.readFileSync(filepath, { encoding: 'utf-8' });
    switch (GlobalConfig.parseMode) {
        case 'json':
            return await parseJson(filepath);

        case 'yaml':
            return await parseYaml(filepath);
    
        default:
            break;
    }
    return undefined;
}


const ZH_CN_SAME_NAME = new Set(['zh', 'zh-cn', 'zh-hans']);
const ZH_TW_SAME_NAME = new Set(['zh-tw', 'zh-hk', 'zh-sg', 'zh-hant']);
function getISO639Code(filename: string) {
    const lowerFilename = filename.toLowerCase();

    for (const iso of ISOCodeArray) {
        if (lowerFilename.includes(iso.code)) {            
            if (ZH_CN_SAME_NAME.has(iso.code)) {
                return { code: "zh-cn",    name: "中文" };
            }
            if (ZH_TW_SAME_NAME.has(iso.code)) {
                return { code: "zh-tw",    name: "繁体中文" };
            }
            return iso;
        }
    }
    return undefined;
}

function getParseSuffix() {
    switch (GlobalConfig.parseMode) {
        case 'json':
            return ['json'];
        case 'yaml':
            return ['yaml', 'yml'];
        default:
            break;
    }
}

function longestCommonPrefix(strs: string[]): string {
    if (strs.length === 0) {
        return '';
    }

    let prefix = strs[0];
    for (let i = 1; i < strs.length; i++) {
        while (strs[i].indexOf(prefix) !== 0) {
            prefix = prefix.slice(0, prefix.length - 1);
            if (prefix === '') {
                return '';
            }
        }
    }

    return prefix;
}

async function updateI18nFromRoot() {
    const { t } = vscode.l10n;
    const root = GlobalConfig.root;
    if (!fs.existsSync(root)) {
        return;
    }

    const parseSuffixs = getParseSuffix();
    const i18nFiles: string[] = [];
    for (const file of fs.readdirSync(root)) {
        let extname = file.split('.').at(-1);
        if (extname === undefined) {
            continue;
        }
        if (parseSuffixs !== undefined && !parseSuffixs.includes(extname.toLowerCase())) {
            continue;   
        }
        i18nFiles.push(file);
    }

    // 去除公共前缀和后缀
    const prefix = await vscode.window.withProgress({
        title: t('info.update-i18n.make-prefix.title'),
        location: vscode.ProgressLocation.Window
    }, async (progress: vscode.Progress<{ message: string, increment: number }>, token: vscode.CancellationToken) => {
        return longestCommonPrefix(i18nFiles);
    });

    const _ = await vscode.window.withProgress({
        title: t('info.update-i18n.parse-iso.title'),
        location: vscode.ProgressLocation.Window
    }, async (progress: vscode.Progress<{ message: string, increment: number }>, token: vscode.CancellationToken) => {
        for (const file of i18nFiles) {
            const i18nTextItem = await makeI18nTextItem(file, prefix);
    
            if (i18nTextItem) {
                I18nTextMap.set(i18nTextItem.code, i18nTextItem);
            }
        }
    });
}


let remindUserErrorMain: boolean = false;

function getFirstOneI18nItem() {
    for (const item of I18nTextMap.values()) {
        return item;
    }
    
    return undefined;
}

/**
 * 
 * @param filename 文件名
 * @param prefix 公共前缀
 * @returns 
 */
async function makeI18nTextItem(filename: string, prefix: string): Promise<I18nTextItem | undefined> {
    const { t } = vscode.l10n;
    let validFileString = filename.slice(prefix.length);
    const extname = filename.split('.').at(-1);
    if (extname === undefined || extname.length === 0) {
        return undefined;
    }
    
    validFileString = validFileString.slice(0, - (extname.length + 1));
    
    const iso = getISO639Code(validFileString);        
    if (iso === undefined) {
        vscode.window.showWarningMessage(t('warning.update-i18n.cannot-find-iso.window') + ' ' + filename);
        return undefined;
    }
    const filePath = path.join(GlobalConfig.root, filename);
    const res = await parseFileByParseMode(filePath);

    if (res) {
        return {
            code: iso.code,
            file: filePath,
            content: res.content,
            keyRanges: res.keyRanges
        }
    }
    return undefined
}

function getI18nFilesFromEvent(event: { files: readonly vscode.Uri[] }) {
    const i18nRootFiles = [];
    for (const file of event.files) {
        if (file.fsPath.startsWith(GlobalConfig.root)) {
            const extname = path.extname(file.fsPath).slice(1).toLowerCase();
            const parseSuffixs = getParseSuffix();
            if (parseSuffixs !== undefined && !parseSuffixs.includes(extname)) {
                continue;
            }
            i18nRootFiles.push(file.fsPath);
        }
    }
    return i18nRootFiles;
}

export function getDefaultI18nItem() {
    // 调用这个函数的时候，比如 inlay hints，初始化还未完成，所以需要额外手动赋值一次 main
    const i18nSetting = vscode.workspace.getConfiguration('i18n-haru');
    let main = i18nSetting.get<string>('main') || 'zh-cn';
    
    if (main.toLowerCase() === 'zh') {
        main = 'zh-cn';
    }
    GlobalConfig.main = main.toLowerCase();

    const item = I18nTextMap.get(main);
    
    if (item === undefined) {
        const { t } = vscode.l10n;
        const firstOne = getFirstOneI18nItem();
        if (firstOne === undefined) {
            return undefined;
        }
        if (remindUserErrorMain === false) {
            vscode.window.showWarningMessage(t('warning.lsp.get-main.cannot-find-main-use-replacer-instead') + ' ' + firstOne.code);
            remindUserErrorMain = true;
        }
        return firstOne;
    } else {
        return item;
    }
}

export const lspLangSelectors: vscode.DocumentFilter[] = [
    {
        language: 'typescript',
        scheme: 'file'
    },
    {
        language: 'vue',
        scheme: 'file'
    },
    {
        language: 'javascript',
        scheme: 'file'
    },
    {
        language: 'html',
        scheme: 'file'
    },
    {
        language: 'php',
        scheme: 'file'
    },
    {
        language: 'json',
        scheme: 'file'
    },
    {
        language: 'yaml',
        scheme: 'file'
    }
];

export const i18nFileSelectors: vscode.DocumentFilter[] = [
    {
        language: 'json',
        scheme: 'file'
    }
];