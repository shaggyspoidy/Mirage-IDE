import { DocItem } from './editor-shortcuts'

export const aiFeatures: DocItem[] = [
  {
    title: 'Chat Panel',
    content: `
The AI Chat Panel allows you to converse with the currently selected AI model. 
- Open it via the right sidebar toggle.
- You can ask questions, paste code, and request refactors.
- **Context Awareness**: The chat automatically includes the content of your currently active file, so you don't need to manually paste it!
    `
  },
  {
    title: 'Applying Code Changes',
    content: `
When the AI generates a code block, Mirage provides a powerful diff view:
- Click the **Apply Diff** button below an AI code block.
- The editor will split into a diff view showing the proposed changes against your current file.
- Click **Accept** or **Reject** in the top right to finalize the changes.
    `
  },
  {
    title: 'Inline Autocomplete (Ghost Text)',
    content: `
Mirage supports real-time inline code completion (like GitHub Copilot).
- It is triggered automatically as you type or by pressing **Ctrl + Space**.
- Press **Tab** to accept the suggestion.
- Ensure you have selected a fast, local model (like \`qwen2.5-coder\`) in the top right dropdown for the best experience.
- You can toggle this feature on or off in the Settings panel.
    `
  }
]
