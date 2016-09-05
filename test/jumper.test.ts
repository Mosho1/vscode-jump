//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

// The module 'assert' provides assertion methods from node
import {expect} from 'chai';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import Jumper, {Tag} from '../src/jumper';

// Defines a Mocha test suite to group tests of similar kind together
suite("Jumper Tests", () => {

    // Defines a Mocha unit test
    test("constructor", () => {
        const options = {editor: true} as any;
        const jumper = new Jumper(options);

        expect(jumper.textEditorDecorationType).not.to.be.null;
        expect(jumper.activeEditor).to.equal(options.editor);
    });

    test("tagLength", () => {
        const jumper = new Jumper();
        expect(jumper.tagLength).to.be.null;
        const tag = new Tag(0, 'a', new vscode.Position(0, 0), 1)
        jumper.tags = [tag];
        expect(jumper.tagLength).to.equal(tag.length)
    });

    test("getTextAndOffsetAroundPosition", async function() {
        const editor = vscode.window.activeTextEditor;
        const testText = 'abcdefg\r\nabcdefg\r\nabcdefg\r\nabcdefg\r\nabcdefg';
        const last2Lines = testText.split('\r\n').slice(-2).join('\r\n');
        await editor.edit(editBuilder => {
            editBuilder.insert(new vscode.Position(0, 0), testText);
        });
        const jumper = new Jumper({editor, range: [-1,1]});
        const {text, offset} = jumper.getTextAndOffsetAroundPosition();

        expect(text).to.eql(last2Lines);
        expect(offset).to.eql(last2Lines.length);
        
    });
});