import { DocItem } from './editor-shortcuts'

export const vimModeDocs: DocItem[] = [
  {
    title: 'Getting Started',
    content: `
Mirage features a fully native Vim engine that maps directly to the Monaco editor.
- **Enable Vim Mode**: Toggle the **VIM** switch located in the top-right corner of the window.
- **Status Bar**: When Vim mode is active, a command-line interface appears at the bottom of your editor pane. It displays your current mode (e.g. \`-- NORMAL --\`, \`-- VISUAL --\`) and provides an input for \`:\` commands.
- **Mode Switching**: Press \`Esc\` or \`Ctrl-c\` to instantly drop back to Normal mode from any other state.
    `
  },
  {
    title: 'Core Mechanics & Operators',
    content: `
The engine supports standard Vim operators, allowing you to combine them with motions or text objects:
- **\`d\`** : Delete (cut)
- **\`c\`** : Change (delete and drop into Insert mode)
- **\`y\`** : Yank (copy)
- **\`p\`** : Put (paste)
- **\`u\`** : Undo (Maps directly to Mirage's native undo history!)
- **\`Ctrl-r\`** : Redo

**The Dot Command**: You can press **\`.\`** to repeat the last modification sequence perfectly.
    `
  },
  {
    title: 'Grammar & Text Objects',
    content: `
Vim's powerful noun-verb grammar is fully supported using "inside" (\`i\`) and "around" (\`a\`) text objects. Combine an operator (like \`c\`) with a text object:

**Common Text Objects:**
- **\`w\`** : Word (e.g., \`ciw\` to change inside word, \`daw\` to delete a word and surrounding whitespace)
- **\`p\`** : Paragraph (e.g., \`dap\` to delete around paragraph)
- **\`"\`, \`'\`, \`\` \`** : Quotes (e.g., \`ci"\` to change inside double quotes)
- **\`(\`, \`{\`, \`[\`, \`<\`** : Brackets/Braces (e.g., \`ya{\` to yank a code block including the braces)
- **\`t\`** : Tags (e.g., \`cit\` to change inside an HTML/XML tag)
    `
  },
  {
    title: 'The Three Visual Modes',
    content: `
Mirage supports all three highlighting states for selecting text:
- **\`v\` (Visual Character)** : Standard character-by-character highlighting.
- **\`Shift-v\` (Visual Line)** : Selects entire lines at a time.
- **\`Ctrl-v\` (Visual Block)** : Column-based block selection, perfect for multi-line vertical edits or deleting vertical indentations.
    `
  },
  {
    title: 'Search and Command-Line',
    content: `
Interact with the document natively via the Vim command line (located at the bottom of the editor pane):
- **Search**: Press **\`/\`** to initiate a forward regex search. Use \`n\` to jump to the next match and \`N\` for the previous.
- **Replace**: Press **\`:\`** to enter command-line mode. You can execute standard substitutions like \`:s/old/new/g\` (replace on current line) or \`:%s/old/new/g\` (replace across the entire file).
- **Clipboard Integration**: Yanking text with \`y\` writes to the internal Vim register. To interact with your system clipboard, prefix your command with the \`+\` register. For example, \`"+y\` copies to the OS clipboard, and \`"+p\` pastes from it.
    `
  }
]
