import * as vscode from 'vscode';
import * as fs from 'fs';
import * as fspath from 'path';

// 参考 ISO 639语言编码 https://kirigaya.cn/blog/article?seq=68
export interface ISOItem {
    code: string,
    name: string
}

export const ISOCodeArray: ISOItem[] = [
    { code: "af",       name: "Afrikaans" },
    { code: "ar",       name: "العربية" },
    { code: "bg",       name: "Български" },
    { code: "bn",       name: "বাংলা" },
    { code: "ca",       name: "Català" },
    { code: "cs",       name: "Čeština" },
    { code: "da",       name: "Dansk" },
    { code: "de",       name: "Deutsch" },
    { code: "el",       name: "Ελληνικά" },
    { code: "en",       name: "English" },
    { code: "es",       name: "Español" },
    { code: "et",       name: "Eesti" },
    { code: "fa",       name: "فارسی" },
    { code: "fi",       name: "Suomi" },
    { code: "fr",       name: "Français" },
    { code: "gu",       name: "ગુજરાતી" },
    { code: "he",       name: "עברית" },
    { code: "hi",       name: "हिन्दी" },
    { code: "hr",       name: "Hrvatski" },
    { code: "hu",       name: "Magyar" },
    { code: "id",       name: "Bahasa Indonesia" },
    { code: "it",       name: "Italiano" },
    { code: "ja",       name: "日本語" },
    { code: "kn",       name: "ಕನ್ನಡ" },
    { code: "ko",       name: "한국어" },
    { code: "lt",       name: "Lietuvių" },
    { code: "lv",       name: "Latviešu" },
    { code: "mk",       name: "Македонски" },
    { code: "ml",       name: "മലയാളം" },
    { code: "mr",       name: "मराठी" },
    { code: "ms",       name: "Bahasa Melayu" },
    { code: "nl",       name: "Nederlands" },
    { code: "no",       name: "Norsk" },
    { code: "pa",       name: "ਪੰਜਾਬੀ" },
    { code: "pl",       name: "Polski" },
    { code: "pt",       name: "Português" },
    { code: "ro",       name: "Română" },
    { code: "ru",       name: "Русский" },
    { code: "sk",       name: "Slovenčina" },
    { code: "sl",       name: "Slovenščina" },
    { code: "so",       name: "Soomaali" },
    { code: "sq",       name: "Shqip" },
    { code: "sr",       name: "Српски" },
    { code: "sv",       name: "Svenska" },
    { code: "sw",       name: "Kiswahili" },
    { code: "ta",       name: "தமிழ்" },
    { code: "te",       name: "తెలుగు" },
    { code: "th",       name: "ไทย" },
    { code: "tr",       name: "Türkçe" },
    { code: "uk",       name: "Українська" },
    { code: "ur",       name: "اردو" },
    { code: "vi",       name: "Tiếng Việt" },
    { code: "zh-cn",    name: "中文" },
    { code: "zh-hans",  name: "中文" },
    { code: "zh-tw",    name: "繁体中文" },
    { code: "zh-hk",    name: "繁體中文" },
    { code: "zh-sg",    name: "繁體中文" },
    { code: "zh-hant",  name: "繁體中文" }
];

export const ValidISOCode = new Set();
for (const item of ISOCodeArray) {
    ValidISOCode.add(item.code);
}

interface ICustomL10n {
    bundle: Record<string, string>,
    uri?: vscode.Uri
}

const customL10n: ICustomL10n = {
    bundle: {},
    uri: undefined
}

export function initialiseCustomL10n(context: vscode.ExtensionContext) {
    if (vscode.l10n.bundle === undefined) {
        const defaultBundlePath = fspath.join(context.extensionPath, 'l10n/bundle.l10n.en.json');
        const bundle = JSON.parse(fs.readFileSync(defaultBundlePath, { encoding: 'utf-8' }));
        Object.assign(customL10n.bundle, bundle);
        customL10n.uri = vscode.Uri.file(defaultBundlePath);
    }
}

/**
 * @description vscode 默认的 i18n bundle 在默认语言（en）时，是空的，此时需要我们自己做处理
 * 为了方便开发，写一个包装函数，只支持无名参数，该函数只与 i18n Haru 的功能多语言呈现有关，与用户使用无关
 * @param message 
 * @param args 
 */
export function t(message: string, ...args: string[]): string {
    if (vscode.l10n.bundle === undefined) {
        const messageContent = customL10n.bundle[message] || message;
        for (let i = 0;i < args.length; ++ i) {
            const placeholder = `{${i}}`;
            messageContent.replace(placeholder, args[i]);
        }
        return messageContent;
    } else {
        return vscode.l10n.t(message, ...args);
    }
}