export interface DocItem {
  title: string
  content: string
}

export const editorShortcuts: DocItem[] = [
  {
    title: 'Global Shortcuts',
    content: `
- **Ctrl + \`** : Toggle the integrated terminal
- **Ctrl + B** : Toggle the File Explorer sidebar
- **Ctrl + Shift + P** : Open the Command Palette
- **Ctrl + ,** : Open Settings
    `
  },
  {
    title: 'File Operations',
    content: `
- **Ctrl + S** : Save the active file
- **Ctrl + Shift + S** : Save all dirty files
- **Ctrl + P** : Quick file search (via Command Palette)
    `
  },
  {
    title: 'Monaco Editor Shortcuts',
    content: `
The editor supports standard VS Code shortcuts:
- **Alt + Up/Down** : Move line up/down
- **Shift + Alt + Up/Down** : Copy line up/down
- **Ctrl + D** : Add selection to next find match
- **Ctrl + /** : Toggle line comment
- **Ctrl + F** : Find within file
- **Ctrl + H** : Replace within file
    `
  }
]
