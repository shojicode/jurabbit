<main class="container mx-auto p-4">
  <h1 class="text-2xl font-bold mb-4">管理者ページ</h1>
  
  <AdminAuth>
    <CurrentRaceManager />
    <BettingStatusManager />
    <RaceResultForm />
  
    <!-- ここに結果入力フォームなど他の管理機能を追加できます -->
  </AdminAuth>
</main>

<script>
// 管理者用のページ
// 機能：馬券購入締切/解禁, 結果入力, 競技ID変更

import BettingStatusManager from '$lib/components/BettingStatusManager.svelte';
import RaceResultForm from '$lib/components/RaceResultForm.svelte';
import AdminAuth from '$lib/components/AdminAuth.svelte';
import CurrentRaceManager from '$lib/components/CurrentRaceManager.svelte';

</script>

<style>
  /* 必要に応じてスタイルをカスタマイズ */
</style>