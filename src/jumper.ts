import * as vscode from 'vscode';

const indexToChar = i => String.fromCharCode(65 + i);

const generateLabelFromIndex = (i, labelLength) => labelLength < 2 ? indexToChar(i) : indexToChar(i / 26) + indexToChar(i % 26);

class Tag {
    range: vscode.Range;
    label: string;

    get length() {
        return this.label.length;
    }

    matches(key: string) {
        return this.label[0].toLowerCase() === key.toLowerCase();
    }

    constructor(public index: number, public characters: string, public position: vscode.Position, labelLength: number) {
        this.label = generateLabelFromIndex(index, labelLength);
        this.range = getRangeAtPosition(position, this.label.length);
    }
}

export interface JumperOptions {
    decoratorOptions?: vscode.DecorationRenderOptions;
};

export enum JumperState { Inactive, Input, Jump };

const getRangeAtPosition = (position: vscode.Position, length = 1) => {
    return new vscode.Range(position, position.translate(0, length));
};

export default class Jumper {

    textEditorDecorationType: vscode.TextEditorDecorationType;
    state = JumperState.Inactive;

    numTags = 26;
    range = [-30, 30]

    get activeEditor() {
        return vscode.window.activeTextEditor
    };

    tags: Tag[] = null;

    get tagLength() {
        const tag = this.tags[0];
        return tag ? tag.length : null;
    }

    constructor(options: JumperOptions) {
        this.textEditorDecorationType = vscode.window.createTextEditorDecorationType(options.decoratorOptions);
    }

    /**
     * Calculate the offset and text around a position in the editor
     * 
     * @param A position in the editor
     * @return the subset text of the document around the
     * position and the offset of the position within that subset
     */
    getTextAndOffsetAroundPosition(position = this.activeEditor.selection.active) {
        const editor = this.activeEditor;
        const activePosition = editor.selection.active;
        const positionOffset = editor.document.offsetAt(activePosition);
        const startLine = activePosition.line + this.range[0] >= 0 ? activePosition.line + this.range[0] : 0;
        const start = new vscode.Position(startLine, 0);
        const startOffset = editor.document.offsetAt(start);
        const end = new vscode.Position(activePosition.line + this.range[1], 9999); // "last" character
        const range = new vscode.Range(start, end);
        const text = editor.document.getText(range);
        const offset = positionOffset - startOffset;

        return { text, offset };
    }

    /**
     * Generate tags for the editor from a key and apply them to the editor
     * 
     * @param An input key
     */
    async getTagsForKey(key: string) {
        const editor = this.activeEditor;
        const {text, offset} = this.getTextAndOffsetAroundPosition();

        const indices: number[] = [];

        // get the indices we want to put labels in
        for (let i = 0, len = text.length; i < len; i++) {
            if (text[i] === key && i !== offset) {
                indices.push(i);
            }
        }

        if (indices.length === 0) {
            this.state = JumperState.Inactive;
            return;
        }

        const labelLength = indices.length > 26 ? 2 : 1;
        
        // if we have a label of length 2, we omit one out of every adjacent pair
        if (labelLength === 2) {
            for (let i = 0, len = indices.length; i < len; i++) {
                if (indices[i + 1] - indices[i] === 1) {
                    indices.splice(i + 1, 1);
                }
            }
        }

        const tags = indices.map((i, j) => {
            return new Tag(j, text.substr(i, labelLength), editor.document.positionAt(i), labelLength);
        });

        return tags;
    }

     /**
     * Set tags across the editor
     * 
     * @param An array of tags
     */
    async setTags(tags: Tag[]) {
        if (this.tags) await this.clearTags();
        if (tags.length === 0) return false;
        this.tags = tags;

        const didEdits = await this.activeEditor.edit(editBuilder => {
            tags.forEach(({range, label}) => {
                editBuilder.replace(range, label);
            });
        });

        const ranges = tags.map(({range}) => range);
        this.activeEditor.setDecorations(this.textEditorDecorationType, ranges);
        this.state = JumperState.Jump;
        return didEdits;
    }

    /**
     * Clear all tags from the editor
     * 
     * @return A boolean indicating succesful edit
     */
    async clearTags() {
        const didEdits = await this.activeEditor.edit(editBuilder => {
            this.tags.forEach(({range, characters}) => {
                editBuilder.replace(range, characters);
            });
        });

        this.activeEditor.setDecorations(this.textEditorDecorationType, []);

        this.tags = null;
        this.state = JumperState.Inactive;
        return didEdits;
    }

    /**
     * Keypress behavior, after tags are set
     * 
     * @param The keypress text
     */
    async keypress(text: string) {
        if (this.tagLength === 1) {
            return this.jump(text);
        }

        let newTags = this.tags
            .filter(tag => tag.matches(text))
            .map(tag => new Tag(tag.index % 26, tag.characters.slice(0, -1), tag.position, 1));

        await this.clearTags();
        await this.setTags(newTags);
    }

    /**
    * Jump to the location indicated by the selected tag
    * 
    * @param The keypress text
    */
    async jump(text: string) {
        const {tags} = this;
        const tag = tags.find(t => t.matches(text));
        if (tag) {
            this.activeEditor.revealRange(tag.range);
            this.activeEditor.selection = new vscode.Selection(tag.position, tag.position);
        }
        await this.clearTags();
        this.state === JumperState.Inactive;
    };
}