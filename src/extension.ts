import * as vscode from 'vscode';
import { configureI18nFolder, I18nTextMap, initialise } from './global';
import { registerCompletions } from './lsp/completion';
import { registerDefinition } from './lsp/definition';
import { registerHover } from './lsp/hover';
import { registerInlayHints } from './lsp/inlayHint';

function registerCommand(context: vscode.ExtensionContext) {
    vscode.commands.registerCommand('i18n-haru.configure-i18n-folder', () => {
        configureI18nFolder(context);
    });

    vscode.commands.registerCommand('i18n-haru.add-token', () => {
        
    });

    // lsp
    registerCompletions(context);
    registerDefinition(context);
    registerHover(context);
    registerInlayHints(context);
}

export async function activate(context: vscode.ExtensionContext) {    
	let disposable = vscode.commands.registerCommand('i18n-haru.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from i18n Haru!');
	});

    registerCommand(context);
    await initialise(context);

    console.log(I18nTextMap);

	context.subscriptions.push(disposable);
}

export function deactivate() {}
