<script lang="ts">
    import { API_URL } from '$lib';
  import { onMount } from 'svelte';
  
  // 型定義
  interface Dino {
    id: number;
    name: string;
    [key: string]: any; // その他のプロパティがある場合
  }
  
  interface Result {
    horse_id: number;
    name: string;
    rank: number | null;
  }

  // フォームデータの初期化
  let raceId = 1;
  let dinos: Dino[] = [];
  let results: Result[] = [];
  let isSubmitting = false;
  let submitMessage = '';
  let errorMessage = '';
  // 確認ダイアログ用の状態
  let showConfirmDialog = false;
  let pendingSubmitData: any = null;
  
  // ドラッグ用の変数
  let draggedItem: Result | null = null;

  // コンポーネントがマウントされたら恐竜データを取得
  onMount(async () => {
    try {
      const response = await fetch('/dinos.json');
      if (!response.ok) throw new Error('恐竜データの取得に失敗しました');
      const data = await response.json();
      dinos = data.dinos; // dinos キーから配列を取得
      
      // 初期結果配列を恐竜ごとに作成
      results = dinos.map((dino: Dino, index: number) => ({
        horse_id: dino.id,
        name: dino.name,
        rank: null
      }));
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : '不明なエラー';
      errorMessage = `データ読み込みエラー: ${errorMsg}`;
      console.error(errorMessage);
    }
  });

  // ドラッグ＆ドロップ関連の関数
  function handleDragStart(event: DragEvent, item: Result) {
    if (event.dataTransfer) {
      draggedItem = item;
      event.dataTransfer.effectAllowed = 'move';
      // 半透明にするためのクラスを追加
      if (event.target instanceof HTMLElement) {
        event.target.classList.add('dragging');
      }
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  function handleDragEnter(event: DragEvent) {
    if (event.target instanceof HTMLElement) {
      event.target.closest('.dino-item')?.classList.add('drag-over');
    }
  }

  function handleDragLeave(event: DragEvent) {
    if (event.target instanceof HTMLElement) {
      event.target.closest('.dino-item')?.classList.remove('drag-over');
    }
  }

  function handleDrop(event: DragEvent, targetItem: Result) {
    event.preventDefault();
    
    // クラスを削除
    document.querySelectorAll('.dino-item').forEach(item => {
      item.classList.remove('drag-over');
    });
    
    if (!draggedItem || draggedItem === targetItem) return;
    
    // リストを並び替え
    const draggedIndex = results.indexOf(draggedItem);
    const targetIndex = results.indexOf(targetItem);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
      results.splice(draggedIndex, 1);
      results.splice(targetIndex, 0, draggedItem);
      results = [...results]; // 再レンダリング用に配列を更新
      
      // 順位を更新
      updateRanks();
    }
    
    draggedItem = null;
  }
  
  function handleDragEnd(event: DragEvent) {
    if (event.target instanceof HTMLElement) {
      event.target.classList.remove('dragging');
    }
    draggedItem = null;
  }
  
  // 順位を更新する関数
  function updateRanks() {
    results.forEach((result, index) => {
      result.rank = index + 1;
    });
  }

  // 順位をリセットする関数
  function resetRanks() {
    results = results.map(r => ({...r, rank: null}));
  }

  // 確認モーダルをキャンセルする関数
  function cancelConfirmation() {
    showConfirmDialog = false;
    pendingSubmitData = null;
    isSubmitting = false;
  }

  // 確認後に結果を更新する関数
  async function confirmAndUpdate() {
    showConfirmDialog = false;
    
    if (!pendingSubmitData) return;
    
    try {
      // このエンドポイントはバックエンドで修正されていることを想定
      // 既存の結果を上書きするために同じエンドポイントを使用
      const response = await fetch(`${API_URL.post.results}?forceUpdate=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pendingSubmitData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'APIエラーが発生しました');
      }

      submitMessage = 'レース結果を更新しました！';
      resetRanks();
      
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : '不明なエラー';
      errorMessage = `更新エラー: ${errorMsg}`;
      console.error(errorMessage);
    } finally {
      pendingSubmitData = null;
      isSubmitting = false;
    }
  }

  // 結果送信処理
  async function submitResults() {
    // 入力検証
    const filledResults = results.filter(r => r.rank !== null && r.rank > 0);
    if (filledResults.length === 0) {
      errorMessage = '少なくとも1つの結果を入力してください';
      return;
    }

    try {
      isSubmitting = true;
      errorMessage = '';
      submitMessage = '';
      
      // API送信用のデータ整形
      const submitData = {
        raceId: parseInt(raceId.toString()),
        results: filledResults.map(r => ({
          horse_id: r.horse_id,
          rank: r.rank !== null ? parseInt(r.rank.toString()) : null
        }))
      };

      const response = await fetch(API_URL.post.results, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData)
      });

      // 409エラー（すでに結果が存在する）のハンドリング
      if (response.status === 409) {
        const errorData = await response.json();
        pendingSubmitData = submitData;
        showConfirmDialog = true;
        return; // 確認ダイアログを表示するため、ここで処理を中断
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'APIエラーが発生しました');
      }

      submitMessage = 'レース結果を登録しました！';
      
      // 成功後にフォームをリセット
      resetRanks();
      
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : '不明なエラー';
      errorMessage = `送信エラー: ${errorMsg}`;
      console.error(errorMessage);
    } finally {
      if (!showConfirmDialog) {
        isSubmitting = false;
      }
    }
  }
</script>

<section>
  <h2>レース結果入力</h2>

  <div class="form-container">
    {#if errorMessage}
      <div class="error-message">{errorMessage}</div>
    {/if}
    
    {#if submitMessage}
      <div class="success-message">{submitMessage}</div>
    {/if}

    <!-- 確認ダイアログ -->
    {#if showConfirmDialog}
      <div class="overlay">
        <div class="confirm-dialog">
          <h3>結果の上書き確認</h3>
          <p>レースID: {raceId} の結果は既に登録されています。</p>
          <p>結果を上書きしますか？</p>
          <div class="dialog-buttons">
            <button type="button" class="cancel-button" on:click={cancelConfirmation}>キャンセル</button>
            <button type="button" class="confirm-button" on:click={confirmAndUpdate}>上書きする</button>
          </div>
        </div>
      </div>
    {/if}

    <form on:submit|preventDefault={submitResults}>
      <div class="form-group">
        <label for="race-id">レースID</label>
        <input 
          id="race-id" 
          type="number" 
          bind:value={raceId} 
          min="1" 
          required
        />
      </div>

      <h3>恐竜を順位順にドラッグして並べ替えてください</h3>
      
      {#if results.length === 0}
        <p>データを読み込み中...</p>
      {:else}
        <div class="instructions">
          <p>ドラッグ＆ドロップで恐竜の順位を決定できます。一番上が1位になります。</p>
          <button type="button" on:click={resetRanks} class="secondary-button">順位をリセット</button>
        </div>
        
        <div class="dino-list">
          {#each results as result (result.horse_id)}
            <div 
              class="dino-item"
              draggable="true"
              on:dragstart={(e) => handleDragStart(e, result)}
              on:dragover={handleDragOver}
              on:dragenter={handleDragEnter}
              on:dragleave={handleDragLeave}
              on:drop={(e) => handleDrop(e, result)}
              on:dragend={handleDragEnd}
            >
              <div class="rank-badge">
                {result.rank !== null ? result.rank : '-'}
              </div>
              <div class="dino-info">
                <span class="dino-id">#{result.horse_id}</span>
                <span class="dino-name">{result.name}</span>
              </div>
              <div class="drag-handle">
                ⋮⋮
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <div class="form-actions">
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '送信中...' : '結果を登録'}
        </button>
      </div>
    </form>
  </div>
</section>

<style>
  .form-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 1rem;
    position: relative;
  }
  
  .form-group {
    margin-bottom: 1rem;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: bold;
  }
  
  input[type="number"] {
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  
  .instructions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .dino-list {
    margin: 1rem 0;
    border: 1px solid #ddd;
    border-radius: 4px;
    overflow: hidden;
  }
  
  .dino-item {
    display: flex;
    align-items: center;
    padding: 0.75rem;
    border-bottom: 1px solid #ddd;
    background-color: white;
    cursor: grab;
    transition: background-color 0.2s;
  }
  
  .dino-item:last-child {
    border-bottom: none;
  }
  
  .dino-item:hover {
    background-color: #f8f8f8;
  }
  
  .dino-item.dragging {
    opacity: 0.5;
  }
  
  .dino-item.drag-over {
    background-color: #e3f2fd;
    border-top: 2px dashed #2196f3;
  }
  
  .rank-badge {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    background-color: #4a90e2;
    color: white;
    font-weight: bold;
    margin-right: 1rem;
  }
  
  .dino-info {
    flex: 1;
  }
  
  .dino-id {
    color: #666;
    margin-right: 0.5rem;
    font-size: 0.9rem;
  }
  
  .dino-name {
    font-weight: bold;
  }
  
  .drag-handle {
    color: #ccc;
    cursor: grab;
    font-size: 1.5rem;
    padding: 0 0.5rem;
  }
  
  .form-actions {
    margin-top: 2rem;
    text-align: center;
  }
  
  button {
    padding: 0.75rem 1.5rem;
    background-color: #4a90e2;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
  }
  
  button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
  
  .secondary-button {
    background-color: #e0e0e0;
    color: #333;
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }
  
  .error-message {
    padding: 0.75rem;
    margin-bottom: 1rem;
    background-color: #ffebee;
    color: #c62828;
    border-radius: 4px;
    border-left: 4px solid #c62828;
  }
  
  .success-message {
    padding: 0.75rem;
    margin-bottom: 1rem;
    background-color: #e8f5e9;
    color: #2e7d32;
    border-radius: 4px;
    border-left: 4px solid #2e7d32;
  }
  
  /* 確認ダイアログ関連のスタイル */
  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  
  .confirm-dialog {
    background-color: white;
    border-radius: 8px;
    padding: 1.5rem;
    width: 90%;
    max-width: 500px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  .confirm-dialog h3 {
    margin-top: 0;
    color: #333;
  }
  
  .dialog-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 1.5rem;
  }
  
  .cancel-button {
    background-color: #e0e0e0;
    color: #333;
  }
  
  .confirm-button {
    background-color: #f44336;
  }
</style>