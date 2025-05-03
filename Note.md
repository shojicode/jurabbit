# SvelteKitノート
ちょこちょこ忘れてたり変わってたりするのでメモしていくぞ
- 開発サーバー起動は`npm run dev`でOK
- SPA遷移はただの`<a>`でOK
- デフォルトでSSR
- `export const prerender = true` : SSG
- メタタグは`<svelte:head>`で書く
- VSCodeでtailwindの補完が効かない場合は、
  - 設定"`"editor.quickSuggestions": { "other": true, "comments": false, "strings": true }`を追加
  - "tailwindcss.includeLanguages": { "svelte": "html" }を追加