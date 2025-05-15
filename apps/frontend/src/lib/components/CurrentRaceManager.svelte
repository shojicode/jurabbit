<div class="bg-white shadow-md rounded p-4 mb-6">
  <h2 class="text-xl font-semibold mb-4">現在の競技ID設定</h2>
  
  <div class="mb-4">
    <p>現在の競技ID: {currentRaceId !== null ? currentRaceId : '読み込み中...'}</p>
  </div>
  
  <form on:submit|preventDefault={updateCurrentRace} class="flex flex-col space-y-4">
    <div>
      <label for="newRaceId" class="block text-sm font-medium text-gray-700 mb-1">
        新しい競技ID
      </label>
      <input
        type="number"
        id="newRaceId"
        bind:value={newRaceId}
        min="1"
        required
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
    
    <button
      type="submit"
      class="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition duration-200"
      disabled={isUpdating}
    >
      {isUpdating ? '更新中...' : '競技IDを更新'}
    </button>
    
    {#if message}
      <div class={`mt-3 p-2 rounded-md ${messageType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        {message}
      </div>
    {/if}
  </form>
</div>

<script lang="ts">
  import { onMount } from 'svelte';

  // 型を明示的に定義
  let currentRaceId: number | null = null;
  let newRaceId: number = 1;
  let isUpdating: boolean = false;
  let message: string = '';
  let messageType: 'success' | 'error' = 'success';

  onMount(async () => {
    await fetchCurrentRaceId();
  });

  // 現在の競技IDを取得する関数
  async function fetchCurrentRaceId(): Promise<void> {
    try {
      const response = await fetch('https://jurabbit-backend.shojiworld.workers.dev/current_race', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        currentRaceId = parseInt(data.currentRaceId);
        // 初期値を現在の値に設定
        newRaceId = currentRaceId;
      } else {
        throw new Error('競技IDの取得に失敗しました');
      }
    } catch (error: unknown) {
      console.error('競技ID取得エラー:', error);
      message = '競技IDの取得に失敗しました';
      messageType = 'error';
    }
  }

  // 競技IDを更新する関数
  async function updateCurrentRace(): Promise<void> {
    if (newRaceId === currentRaceId) {
      message = '同じ競技IDです。変更はありません。';
      messageType = 'error';
      return;
    }

    isUpdating = true;
    message = '';
    
    try {
      const response = await fetch('https://jurabbit-backend.shojiworld.workers.dev/current_race', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raceId: Number(newRaceId) }),
      });

      if (response.ok) {
        currentRaceId = newRaceId;
        message = '競技IDの更新に成功しました';
        messageType = 'success';
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || '競技IDの更新に失敗しました');
      }
    } catch (error: unknown) {
      console.error('競技ID更新エラー:', error);
      message = `競技IDの更新に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`;
      messageType = 'error';
    } finally {
      isUpdating = false;
    }
  }
</script>