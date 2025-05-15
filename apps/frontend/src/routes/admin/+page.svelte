<main class="container mx-auto p-4">
  <h1 class="text-2xl font-bold mb-4">管理者ページ</h1>
  
  <section class="mb-8 p-4 bg-white rounded shadow">
    <h2 class="text-xl font-semibold mb-4">馬券購入状態管理</h2>
    
    <div class="mb-4">
      <p class="text-lg">
        現在の状態: 
        {#if isLoading}
          <span class="text-gray-400">読み込み中...</span>
        {:else}
          <span class={isBettingEnabled ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
            {isBettingEnabled ? '馬券購入可能' : '馬券購入締切中'}
          </span>
        {/if}
      </p>
    </div>
    
    <div class="flex gap-4">
      <button
        onclick={enableBetting}
        disabled={isLoading || isBettingEnabled}
        class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        馬券購入を開始
      </button>
      
      <button
        onclick={disableBetting}
        disabled={isLoading || !isBettingEnabled}
        class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        馬券購入を締め切る
      </button>
      
      <button
        onclick={fetchBettingStatus}
        disabled={isLoading}
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        状態を更新
      </button>
    </div>
    
    {#if statusMessage}
      <div class="mt-4 p-2 bg-gray-100 rounded">
        {statusMessage}
      </div>
    {/if}
  </section>
  
  <!-- ここに結果入力フォームなど他の管理機能を追加できます -->
</main>

<script>
// 管理者用のページ
// 機能：馬券購入締切/解禁, 結果入力

import { onMount } from 'svelte';

// APIのベースURL
const API_BASE_URL = 'http://localhost:8787'; // 開発環境のURL、本番環境では変更する

// 状態変数（Svelte 5のrune APIを使用）
let isBettingEnabled = $state(false);
let isLoading = $state(false);
let statusMessage = $state('');

// 現在の馬券購入状態を取得
async function fetchBettingStatus() {
  try {
    isLoading = true;
    const response = await fetch(`${API_BASE_URL}/betting_status`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('APIリクエストが失敗しました');
    }
    
    const data = await response.json();
    isBettingEnabled = data.betting_enabled;
    statusMessage = `馬券購入は現在${isBettingEnabled ? '有効' : '無効'}です`;
  } catch (error) {
    console.error('馬券購入状態の取得に失敗:', error);
    statusMessage = 'エラー: 状態の取得に失敗しました';
  } finally {
    isLoading = false;
  }
}

// 馬券購入を有効にする
async function enableBetting() {
  try {
    isLoading = true;
    statusMessage = '処理中...';
    
    const response = await fetch(`${API_BASE_URL}/enable_betting`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('APIリクエストが失敗しました');
    }
    
    await fetchBettingStatus();
    statusMessage = '馬券購入を有効にしました';
  } catch (error) {
    console.error('馬券購入の有効化に失敗:', error);
    statusMessage = 'エラー: 馬券購入の有効化に失敗しました';
  } finally {
    isLoading = false;
  }
}

// 馬券購入を無効にする
async function disableBetting() {
  try {
    isLoading = true;
    statusMessage = '処理中...';
    
    const response = await fetch(`${API_BASE_URL}/disable_betting`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('APIリクエストが失敗しました');
    }
    
    await fetchBettingStatus();
    statusMessage = '馬券購入を無効にしました';
  } catch (error) {
    console.error('馬券購入の無効化に失敗:', error);
    statusMessage = 'エラー: 馬券購入の無効化に失敗しました';
  } finally {
    isLoading = false;
  }
}

// コンポーネントのマウント時に現在の状態を取得
onMount(() => {
  fetchBettingStatus();
});
</script>

<style>
  /* 必要に応じてスタイルをカスタマイズ */
</style>