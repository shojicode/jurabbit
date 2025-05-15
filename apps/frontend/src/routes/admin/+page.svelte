<main class="container mx-auto p-4">
  <h1 class="text-2xl font-bold mb-4">管理者ページ</h1>
  
  <BettingStatusManager />
  
  <!-- ここに結果入力フォームなど他の管理機能を追加できます -->
</main>

<script>
// 管理者用のページ
// 機能：馬券購入締切/解禁, 結果入力

import BettingStatusManager from '$lib/components/BettingStatusManager.svelte';

</script>

<style>
  /* 必要に応じてスタイルをカスタマイズ */
</style>