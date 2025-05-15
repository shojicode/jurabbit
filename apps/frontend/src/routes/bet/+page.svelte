<script lang="ts">
    import { onMount } from 'svelte';
    import { API_URL } from '$lib';
    
    interface Dino {
        id: number;
        name: string;
        description: string;
    }
    
    // 状態管理
    let currentRaceId: number | null = null;
    let betResult: any = null;
    let error: string | null = null;
    let dinos: Dino[] = [];
    let isBettingEnabled = false;
    let isLoading = false;
    
    // 選択状態
    let selectedDinos: number[] = [];
    let isSubmitting = false;
    let isUpdating = false; // 予想更新モード
    
    // 更新前の予想結果を保存するための変数
    let originalBetResult: any = null;
    
    // ドラッグ＆ドロップ関連
    let draggedDinoId: number | null = null;
    let dragSourceIndex: number | null = null; // ドラッグ開始位置
    let isDragOver: boolean[] = [false, false, false]; // 各ドロップエリアのドラッグオーバー状態
    
    // ページ読み込み時に初期データを取得
    onMount(async () => {
        try {
            isUpdating = false; // 初期状態では更新モードをオフに
            await Promise.all([
                fetchCurrentRace(),
                fetchDinoData(),
                fetchBettingStatus()
            ]);
            
            // 現在の競争IDが取得できたら、ユーザーの予想を取得
            if (currentRaceId) {
                await fetchUserPrediction();
            }
        } catch (err) {
            error = 'データの初期化に失敗しました: ' + (err instanceof Error ? err.message : String(err));
        }
    });
    
    // 現在の競争IDを取得
    async function fetchCurrentRace() {
        try {
            const response = await fetch(API_URL.get.current_race);
            if (response.ok) {
                const data = await response.json();
                currentRaceId = parseInt(data.currentRaceId);
            } else {
                error = '現在の競争IDを取得できませんでした';
            }
        } catch (err) {
            throw new Error('競争ID取得エラー: ' + (err instanceof Error ? err.message : String(err)));
        }
    }
    
    // 恐竜データの取得
    async function fetchDinoData() {
        try {
            const response = await fetch('/dinos.json');
            if (response.ok) {
                const data = await response.json();
                dinos = data.dinos;
            } else {
                error = '恐竜データを取得できませんでした';
            }
        } catch (err) {
            throw new Error('恐竜データ取得エラー: ' + (err instanceof Error ? err.message : String(err)));
        }
    }
    
    // 馬券購入状態の取得
    async function fetchBettingStatus() {
        try {
            const response = await fetch(API_URL.get.betting_status);
            if (response.ok) {
                const data = await response.json();
                isBettingEnabled = data.betting_enabled;
            } else {
                error = '馬券購入状態を取得できませんでした';
            }
        } catch (err) {
            throw new Error('馬券購入状態取得エラー: ' + (err instanceof Error ? err.message : String(err)));
        }
    }
    
    // ユーザーの予想を取得
    async function fetchUserPrediction() {
        try {
            isLoading = true;
            // 新しいAPIエンドポイント - ユーザーの予想を取得
            const response = await fetch(`${API_URL.get.user_prediction}/${currentRaceId}`, {
                credentials: 'include' // Cookieを送信
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data && data.bet) {
                    // 予想データがある場合はbetResultに設定
                    betResult = data;
                }
            } else if (response.status !== 404) {
                // 404はユーザーの予想が存在しないだけなのでエラーとしない
                error = 'あなたの予想を取得できませんでした';
            }
        } catch (err) {
            console.error('予想取得エラー:', err);
            // 致命的ではないエラーなのでユーザーには表示しない
        } finally {
            isLoading = false;
        }
    }
    
    // 恐竜の選択処理
    function toggleDinoSelection(dinoId: number) {
        const index = selectedDinos.indexOf(dinoId);
        
        if (index !== -1) {
            // すでに選択されている場合は削除
            selectedDinos = selectedDinos.filter(id => id !== dinoId);
        } else if (selectedDinos.length < 3) {
            // 3つ未満の場合は追加
            selectedDinos = [...selectedDinos, dinoId];
        }
    }
    
    // 賭けをリセット
    function resetBet() {
        // 更新モードに入る前に現在の予想結果を保存
        originalBetResult = betResult;
        selectedDinos = [];
        error = null;
        isUpdating = true; // 予想更新モードをオンにする
    }
    
    // 更新モードをキャンセル
    function cancelUpdate() {
        // 元の予想結果を復元
        betResult = originalBetResult;
        selectedDinos = [];
        error = null;
        isUpdating = false;
        originalBetResult = null;
    }
    
    // バックエンドのbet APIを呼び出す関数
    async function callBetAPI() {
        if (!currentRaceId) {
            error = '競争IDが取得できていません';
            return;
        }
        
        if (!isBettingEnabled) {
            error = '現在、予想の受付が締め切られています';
            return;
        }
        
        if (selectedDinos.length !== 3) {
            error = '3頭の恐竜を選択してください';
            return;
        }
        
        try {
            isSubmitting = true;
            error = null;
            
            const [firstChoice, secondChoice, thirdChoice] = selectedDinos;
            
            // 現在のユーザーIDを取得（クッキーから読み取る場合はここで）
            const userId = null; // nullの場合、APIがユーザーIDを生成して返す
            
            // APIリクエスト
            const response = await fetch(API_URL.post.bet, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    userId,
                    raceId: currentRaceId,
                    firstChoice,
                    secondChoice,
                    thirdChoice
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                betResult = data;
                // 予想送信成功時に入力フォームをクリア
                selectedDinos = [];
            } else {
                error = `エラー: ${data.error || response.statusText}`;
            }
        } catch (err) {
            error = 'APIエラー: ' + (err instanceof Error ? err.message : String(err));
        } finally {
            isSubmitting = false;
        }
    }
    
    // 予想更新用のAPI呼び出し関数
    async function updateBetAPI() {
        if (!currentRaceId) {
            error = '競争IDが取得できていません';
            return;
        }
        
        // 先に予想受付状態を最新の情報に更新
        await fetchBettingStatus();
        
        if (!isBettingEnabled) {
            error = '現在、予想の受付が締め切られています。予想を更新できません。';
            return;
        }
        
        try {
            isSubmitting = true;
            error = null;
            
            // APIリクエスト - PUT(更新)メソッドを使用
            const response = await fetch(`${API_URL.post.bet}/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    raceId: currentRaceId,
                    firstChoice: selectedDinos[0] || null,
                    secondChoice: selectedDinos[1] || null,
                    thirdChoice: selectedDinos[2] || null
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                betResult = data;
                selectedDinos = [];
                isUpdating = false; // 更新モードを終了し、送信完了画面を表示
                originalBetResult = null; // 保存していた元のデータをクリア
            } else {
                error = `エラー: ${data.error || response.statusText}`;
            }
        } catch (err) {
            error = 'APIエラー: ' + (err instanceof Error ? err.message : String(err));
        } finally {
            isSubmitting = false;
        }
    }
    
    // 選択済みの恐竜名を取得
    function getSelectedDinoName(index: number): string {
        if (index >= selectedDinos.length) return '未選択';
        const dinoId = selectedDinos[index];
        const dino = dinos.find(d => d.id === dinoId);
        return dino ? dino.name : '不明';
    }
    
    // ドラッグ＆ドロップ機能----------------------------------------------------
    // 恐竜リストからのドラッグ開始
    function handleDragStart(dinoId: number) {
        draggedDinoId = dinoId;
        dragSourceIndex = null; // リストからのドラッグなので位置はnull
    }
    
    // 選択済み枠からのドラッグ開始
    function handleSelectedDragStart(event: DragEvent, index: number) {
        if (index < selectedDinos.length) {
            draggedDinoId = selectedDinos[index];
            dragSourceIndex = index;
            
            // ドラッグ中の要素の見た目を調整
            if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = 'move';
            }
        }
    }
    
    function handleDragOver(event: DragEvent, index: number) {
        event.preventDefault();
        isDragOver[index] = true;
    }
    
    function handleDragLeave(event: DragEvent, index: number) {
        event.preventDefault();
        isDragOver[index] = false;
    }
    
    function handleDrop(event: DragEvent, targetIndex: number) {
        event.preventDefault();
        isDragOver[targetIndex] = false;
        
        if (draggedDinoId === null) return;
        
        let newSelectedDinos = [...selectedDinos];
        
        if (dragSourceIndex !== null) {
            // 選択済み枠からのドラッグ（位置の入れ替え）
            if (dragSourceIndex !== targetIndex) {
                // 元の位置から削除
                const [movedDino] = newSelectedDinos.splice(dragSourceIndex, 1);
                // 新しい位置に挿入
                newSelectedDinos.splice(targetIndex, 0, movedDino);
            }
        } else {
            // リストからのドラッグ（新規追加または入れ替え）
            // 既存の選択から削除
            newSelectedDinos = newSelectedDinos.filter(id => id !== draggedDinoId);
            
            // 新しい位置に挿入
            newSelectedDinos.splice(targetIndex, 0, draggedDinoId);
            
            // 3つまでに制限
            newSelectedDinos = newSelectedDinos.slice(0, 3);
        }
        
        selectedDinos = newSelectedDinos;
        draggedDinoId = null;
        dragSourceIndex = null;
    }
</script>

<div class="max-w-7xl mx-auto p-5 font-sans">
    <h1 class="text-center text-2xl lg:text-3xl text-gray-800 font-bold mb-8">恐竜の逆鱗取り競争 予想フォーム</h1>
    
    {#if isLoading}
        <div class="text-center p-5">
            <p class="text-gray-600">データをロード中...</p>
        </div>
    {/if}
    
    {#if !isBettingEnabled}
        <div class="text-center p-3 bg-red-100 border border-red-500 rounded-lg mb-6">
            <p class="text-red-700 font-semibold">
                <span class="material-icons text-lg align-middle">lock</span>
                現在、予想の受付は締め切られています
            </p>
            <div class="flex justify-center mt-2">
                <button 
                    class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full flex items-center space-x-1 transition duration-300 shadow-md" 
                    on:click={fetchBettingStatus}>
                    <span class="material-icons text-lg">refresh</span>
                    <span>更新</span>
                </button>
            </div>
        </div>
    {:else}
        <div class="text-center p-3 bg-green-100 border border-green-500 rounded-lg mb-6">
            <p class="text-green-700 font-semibold">予想の受付中です！</p>
        </div>
    {/if}
    
    {#if currentRaceId}
        <div class="text-center mb-8">
            <h2 class="text-xl text-blue-600 font-semibold">現在の競争: #{currentRaceId}</h2>
        </div>
    {/if}
    
    <!-- 予想送信結果がある場合も、更新モードの時はフォームを表示する -->
    {#if !betResult || isUpdating}
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-gray-50 rounded-xl p-5 shadow-md md:col-span-1">
                <h2 class="text-lg text-gray-700 font-semibold pb-3 border-b-2 border-gray-200 mb-4">
                    {isUpdating ? 'あなたの予想を更新（3頭選択）' : 'あなたの予想（3頭選択）'}
                </h2>
                
                <div class="flex flex-col gap-3 mb-5">
                    {#each Array(3) as _, i}
                        <div 
                            class={`min-h-[60px] rounded-md flex items-center justify-center p-3 transition-all duration-200 
                            ${i < selectedDinos.length ? 'border-2 border-blue-500 bg-blue-50' : 'border-2 border-dashed border-gray-300'}
                            ${isDragOver[i] ? 'bg-blue-100 border-blue-700' : ''}
                            ${i < selectedDinos.length ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
                            draggable={i < selectedDinos.length}
                            on:dragstart={(e) => handleSelectedDragStart(e, i)}
                            on:dragover={(e) => handleDragOver(e, i)}
                            on:dragleave={(e) => handleDragLeave(e, i)}
                            on:drop={(e) => handleDrop(e, i)}
                        >
                            {#if i < selectedDinos.length}
                                <div class="w-full flex items-center">
                                    <span class="w-9 h-9 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mr-3 flex-shrink-0">
                                        {i + 1}位
                                    </span>
                                    <span class="flex-grow">{getSelectedDinoName(i)}</span>
                                    <button class="text-red-500 text-2xl hover:text-red-700" on:click={() => toggleDinoSelection(selectedDinos[i])}>×</button>
                                </div>
                            {:else}
                                <span class="text-gray-500 text-center">ここに恐竜をドラッグ<br><span class="text-xs">または選択したい恐竜をクリック</span></span>
                            {/if}
                        </div>
                    {/each}
                </div>
                
                <div class="mt-2 p-3 bg-yellow-50 border border-yellow-300 rounded-lg text-sm text-yellow-700">
                    <p>ドラッグ＆ドロップで順位を並べ替えることができます。</p>
                </div>
                
                <div class="flex gap-3 mt-5">
                    <button 
                        class="flex-1 py-2 px-3 bg-gray-200 text-gray-600 font-semibold rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        on:click={isUpdating ? cancelUpdate : resetBet}
                        disabled={!isUpdating && selectedDinos.length === 0 || isSubmitting}
                    >
                        {isUpdating ? '更新をキャンセル' : '選択をリセット'}
                    </button>
                    
                    <button 
                        class="flex-2 py-2 px-3 bg-green-500 text-white font-semibold rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        on:click={isUpdating ? updateBetAPI : callBetAPI}
                        disabled={selectedDinos.length !== 3 || !isBettingEnabled || isSubmitting}
                    >
                        {isSubmitting ? '送信中...' : isUpdating ? '予想を更新' : '予想を送信'}
                    </button>
                </div>
            </div>
            
            <div class="bg-white rounded-xl p-5 shadow-md md:col-span-2">
                <h2 class="text-lg text-gray-700 font-semibold pb-3 border-b-2 border-gray-200 mb-4">出走恐竜リスト</h2>
                {#if dinos.length === 0}
                    <p class="text-center text-gray-500 py-5">恐竜データを読み込み中...</p>
                {:else}
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto p-2">
                        {#each dinos as dino}
                            <div 
                                class={`border rounded-lg p-4 cursor-pointer transition-all transform hover:shadow-lg hover:-translate-y-1 
                                ${selectedDinos.includes(dino.id) ? 
                                'border-blue-500 bg-blue-50 shadow-md shadow-blue-100' : 
                                'border-gray-200 bg-gray-50'}`}
                                draggable="true"
                                on:dragstart={() => handleDragStart(dino.id)}
                                on:click={() => toggleDinoSelection(dino.id)}
                            >
                                <div class="flex items-center mb-2">
                                    <span class="bg-gray-800 text-white text-xs px-2 py-1 rounded mr-2">#{dino.id}</span>
                                    <span class="font-bold text-gray-800">{dino.name}</span>
                                </div>
                                <p class="text-sm text-gray-600 overflow-hidden line-clamp-3 mb-2">{dino.description}</p>
                                <div class="text-center mt-2">
                                    {#if selectedDinos.includes(dino.id)}
                                        <span class="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                            {selectedDinos.indexOf(dino.id) + 1}位
                                        </span>
                                    {:else}
                                        <span class="text-gray-400 text-xs">クリックして選択</span>
                                    {/if}
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    {#if betResult && !isUpdating}
        <div class="bg-gray-50 border-2 border-green-500 rounded-xl p-5 mt-8 mx-auto max-w-3xl">
            <h2 class="text-xl text-green-600 font-semibold text-center mb-4">
                {betResult.updated ? '予想更新完了' : '予想送信完了'}
            </h2>
            <div class="bg-white rounded-lg p-4 mb-4 shadow-sm">
                <div class="space-y-2">
                    <!-- betResult.betオブジェクトがある場合はそれを使用、なければbetResult自体を使用 -->
                    {#if betResult.bet || betResult}
                        {@const bet = betResult.bet || betResult}
                        <p><span class="font-semibold">競争ID:</span> {bet.raceId || '不明'}</p>
                        <p class="font-semibold mb-2">あなたの予想:</p>
                        <div class="pl-5 space-y-2">
                            {#if bet.firstChoice !== undefined}
                                <div class="flex items-center">
                                    <span class="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mr-3">1</span>
                                    <span>
                                        {bet.firstChoice} - 
                                        {dinos.find(d => d.id === bet.firstChoice)?.name || '不明'}
                                    </span>
                                </div>
                            {/if}
                            
                            {#if bet.secondChoice !== undefined}
                                <div class="flex items-center">
                                    <span class="w-8 h-8 bg-blue-400 text-white rounded-full flex items-center justify-center font-bold mr-3">2</span>
                                    <span>
                                        {bet.secondChoice} - 
                                        {dinos.find(d => d.id === bet.secondChoice)?.name || '不明'}
                                    </span>
                                </div>
                            {/if}
                            
                            {#if bet.thirdChoice !== undefined}
                                <div class="flex items-center">
                                    <span class="w-8 h-8 bg-blue-300 text-white rounded-full flex items-center justify-center font-bold mr-3">3</span>
                                    <span>
                                        {bet.thirdChoice} - 
                                        {dinos.find(d => d.id === bet.thirdChoice)?.name || '不明'}
                                    </span>
                                </div>
                            {/if}
                        </div>
                        
                        {#if bet.token}
                            <div class="mt-4 p-3 bg-gray-50 rounded border-l-4 border-yellow-500">
                                <p class="font-semibold">参加トークン:</p>
                                <code class="block p-3 bg-gray-800 text-gray-100 rounded my-2 break-words font-mono">{bet.token}</code>
                                <p class="text-sm text-yellow-600">※このトークンは結果確認時に必要です。大切に保管してください。</p>
                            </div>
                        {/if}
                        
                        {#if betResult.message}
                            <div class="mt-4 p-3 bg-green-50 rounded border border-green-300 text-green-700">
                                <p class="text-center font-semibold">
                                    {betResult.updated ? '予想を更新しました' : '予想を受け付けました'}
                                </p>
                            </div>
                        {/if}
                    {/if}
                </div>
            </div>
            
            <div class="flex justify-center space-x-4">
                <button 
                    class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded transition-colors"
                    on:click={() => {
                        // 予想更新モードに切り替え
                        resetBet();
                    }}
                >
                     予想を更新する
                </button>
                
                <a 
                    href="/result"
                    class="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded transition-colors flex items-center"
                >
                    結果を確認する
                </a>
                
                {#if isUpdating}
                    <button 
                        class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded transition-colors"
                        on:click={cancelUpdate}
                    >
                        キャンセル
                    </button>
                {/if}
            </div>
        </div>
    {/if}
    
    {#if error}
        <div class="fixed bottom-5 right-5 bg-red-100 border-l-4 border-red-500 p-4 pr-10 rounded shadow-lg max-w-md animate-slide-in">
            <p class="text-red-700">{error}</p>
            <button 
                class="absolute top-1 right-1 text-red-500 hover:text-red-700"
                on:click={() => error = null}
            >
                ×
            </button>
        </div>
    {/if}
</div>

<style>
    /* カスタムアニメーション用のスタイル */
    @keyframes slide-in {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .animate-slide-in {
        animation: slide-in 0.3s ease-out forwards;
    }
    
    /* tailwindのline-clampプラグインがない場合のフォールバック */
    .line-clamp-3 {
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
</style>