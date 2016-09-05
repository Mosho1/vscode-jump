'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import Jumper, {JumperState} from './jumper';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json

    const decoratorOptions: vscode.DecorationRenderOptions = {
        dark: {
            color: '#fff',
            backgroundColor: '#848484',
        }
    };

    const jumper = new Jumper({ decoratorOptions });

    context.subscriptions.push(vscode.commands.registerCommand('extension.toggleLabels', async function () {
        await jumper.clearTags();
        jumper.state = JumperState.Input;
    }));

    // TODO: disengage if anything but a-z is pressed
    context.subscriptions.push(vscode.commands.registerCommand('type', async function (args: { text: string }) {
        if (jumper.state === JumperState.Jump) {
            await jumper.keypress(args.text);
        } else if (jumper.state === JumperState.Input) {
            // TODO put this in jumper.ts?
            if (jumper.isValidKey(args.text)) {
                const tags = await jumper.getTagsForKey(args.text);
                await jumper.setTags(tags);
            } else {
                await jumper.clearTags();
            }
        } else {
            vscode.commands.executeCommand('default:type', args);
        }
    }));

}

// this method is called when your extension is deactivated
export function deactivate() {
}