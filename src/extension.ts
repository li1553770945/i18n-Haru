import * as vscode from 'vscode';
import { configureI18nFolder, I18nTextMap, initialise } from './global';
import { registerCompletions } from './lsp/completion';
import { registerDefinition } from './lsp/definition';
import { registerHover } from './lsp/hover';
import { registerInlayHints } from './lsp/inlayHint';
import { addI18nToken, deleteI18nToken, extractUnfinishedItems, implChange } from './util';
import { registerCodeAction } from './lsp/codeAction';

function registerCommand(context: vscode.ExtensionContext) {
    vscode.commands.registerCommand('i18n-haru.configure-i18n-folder', () => {
        configureI18nFolder(context);
    });

    vscode.commands.registerCommand('i18n-haru.add-token', () => {
        addI18nToken(context);
    });
    
    vscode.commands.registerCommand('i18n-haru.delete-token', () => {
        deleteI18nToken(context);
    });

    vscode.commands.registerCommand('i18n-haru.extract-unfinished-message', (uri) => {
        extractUnfinishedItems(context, uri);
    });

    vscode.commands.registerCommand('i18n-haru.impl-change-to-origin', (uri) => {
        implChange(uri);
    });

    // lsp
    registerCompletions(context);
    registerDefinition(context);
    registerHover(context);
    registerInlayHints(context);
    registerCodeAction(context);
}

export async function activate(context: vscode.ExtensionContext) {    
	let disposable = vscode.commands.registerCommand('i18n-haru.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from i18n Haru!');
	});

    await initialise(context);
    registerCommand(context);

	context.subscriptions.push(disposable);
}

export function deactivate() {}
