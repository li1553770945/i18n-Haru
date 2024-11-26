import OpenAI from 'openai';
import * as vscode from 'vscode';
import { t } from './i18n';
import { ChatCompletion, ChatCompletionMessageParam } from 'openai/resources';
import { I18nTextMap } from './global';


export const translatePrompt = 'Please translate the value part of the following i18n message into languages corresponding to the language codes {0}, and return them as JSON strings mapped to their respective language codes. Do not include any markdown code blocks or any additional characters:';
export type LlmName = 'chatgpt' | 'kimi' | 'deepseek' | 'none'

// 返回类似这样的结果：
// {
//     "ja": "変更を {0} 項目の {hello} に適用しています。これは {1} です。",
//     "en": "Applying changes to {0} item {hello}. This is a {1}.",
//     "de": "Änderungen werden auf {0} Element {hello} angewendet. Dies ist ein {1}.",
//     "zh-tw": "正在將修改應用於 {0} 項目中 {hello}。這是一個 {1}。"
// }
export async function translate(
    messageContent: string,
    LlmName: LlmName
): Promise<Record<string, string> | undefined> {
    const apiKey = vscode.workspace.getConfiguration('i18n-haru').get<string>('translator-apiKey') || '';
    
    if (LlmName !== 'none' && (apiKey.length === 0 || apiKey === 'undefined')) {
        vscode.window.showErrorMessage(
            t('error.translate.lack-api-key.message', LlmName),
            { title: t('error.translate.action.write-apikey'), value: true }
        ).then(res => {
            if (res?.value) {
                vscode.commands.executeCommand('workbench.action.openSettings', 'i18n-haru.translator-apiKey');
            }
        });

        return undefined;
    }

    const allCodes = [...I18nTextMap.keys()];
    const completePrompt = translatePrompt.replace('{0}', allCodes.join(',')) + '\n' + '"' + messageContent + '"';
    const messages: ChatCompletionMessageParam[] = [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: completePrompt }
    ];

    let openai: OpenAI;
    let completion: ChatCompletion;
    let message: string;

    switch (LlmName) {
        case 'chatgpt':
            openai = new OpenAI({
                apiKey
            });
            completion = await openai.chat.completions.create({
                messages,
                model: "deepseek-chat",
            });
            message = completion.choices[0].message.content || '';
            break;
        case 'kimi':
            openai = new OpenAI({
                baseURL: 'https://api.moonshot.cn/v1',
                apiKey
            });
            completion = await openai.chat.completions.create({
                messages,
                model: "moonshot-v1-8k",
            });
            message = completion.choices[0].message.content || '';
            break;
        case 'deepseek':
            openai = new OpenAI({
                baseURL: 'https://api.deepseek.com',
                apiKey
            });
            completion = await openai.chat.completions.create({
                messages,
                model: "deepseek-chat",
            });
            message = completion.choices[0].message.content || '';
            break;
        case 'none':
            const noneMessages: Record<string, string> = {};
            for (const code of allCodes) {
                noneMessages[code] = messageContent;
            }
            return noneMessages;
    }

    console.log('[debug] llm message: ' + message);
    
    try {
        const json = JSON.parse(message);
        const uncheckCodes = new Set<string>(allCodes);
        const alignMessages: Record<string, string> = {};
        for (const code of Object.keys(json)) {
            const message = json[code].toString() as string;
            if (uncheckCodes.has(code)) {
                uncheckCodes.delete(code);
                alignMessages[code] = message;
            }
        }
        if (uncheckCodes.size > 0) {
            vscode.window.showWarningMessage(t('warn.translate.llm-lack-code', [...uncheckCodes.keys()].toString()));
            for (const code of uncheckCodes) {
                alignMessages[code] = messageContent;
            }   
        }
        return alignMessages;
    } catch (error) {
        vscode.window.showErrorMessage(t('error.translate.invalid-llm-return-result'));
        const noneMessages: Record<string, string> = {};
        for (const code of allCodes) {
            noneMessages[code] = messageContent;
        }
        return noneMessages;
    }

    return undefined;
}