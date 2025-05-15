<h1>馬券購入ページ</h1>

<button on:click={() => callBetAPI()}>
    ランダムに賭ける
</button>

{#if betResult}
    <div class="result">
        <h2>賭け結果</h2>
        <pre>{JSON.stringify(betResult, null, 2)}</pre>
    </div>
{/if}

{#if error}
    <div class="error">
        <p>エラーが発生しました: {error}</p>
    </div>
{/if}

<script lang="ts">
    import { onMount } from 'svelte';
    
    let currentRaceId: number | null = null;
    let betResult: any = null;
    let error: string | null = null;
    
    // ページ読み込み時に現在のレースIDを取得
    onMount(async () => {
        try {
            const response = await fetch('http://localhost:8787/current_race');
            if (response.ok) {
                const data = await response.json();
                currentRaceId = parseInt(data.currentRaceId);
            } else {
                error = '現在のレースIDを取得できませんでした';
            }
        } catch (err) {
            error = 'APIエラー: ' + (err instanceof Error ? err.message : String(err));
        }
    });
    
    // ランダムな馬IDを生成する関数（実際の環境では1〜頭数の範囲で生成すべき）
    function generateRandomHorseId(): number {
        // 仮に馬IDを1〜20の範囲でランダムに生成
        return Math.floor(Math.random() * 20) + 1;
    }
    
    // バックエンドのbet APIを呼び出す関数
    async function callBetAPI() {
        if (!currentRaceId) {
            error = 'レースIDが取得できていません';
            return;
        }
        
        try {
            error = null;
            
            // ランダムな馬IDを生成
            const firstChoice = generateRandomHorseId();
            let secondChoice = generateRandomHorseId();
            let thirdChoice = generateRandomHorseId();
            
            // 重複を避ける
            while (secondChoice === firstChoice) {
                secondChoice = generateRandomHorseId();
            }
            while (thirdChoice === firstChoice || thirdChoice === secondChoice) {
                thirdChoice = generateRandomHorseId();
            }
            
            // 現在のユーザーIDを取得（クッキーから読み取る場合はここで）
            const userId = null; // nullの場合、APIがユーザーIDを生成して返す
            
            console.log(JSON.stringify({
                userId,
                raceId: currentRaceId,
                firstChoice,
                secondChoice,
                thirdChoice
            }, null, 2));
            // APIリクエスト
            const response = await fetch('http://localhost:8787/bet', {
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

            console.log('current user id :', )
            
            const data = await response.json();
            console.log('APIレスポンス:', JSON.stringify(data, null, 2));
            
            if (response.ok) {
                betResult = data;
            } else {
                error = `エラー: ${data.error || response.statusText}`;
            }
        } catch (err) {
            error = 'APIエラー: ' + (err instanceof Error ? err.message : String(err));
        }
    }
</script>

<style>
    .result {
        margin-top: 20px;
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: 5px;
        background-color: #f5f5f5;
    }
    
    .error {
        margin-top: 20px;
        padding: 10px;
        border: 1px solid #f88;
        border-radius: 5px;
        background-color: #fee;
        color: #c00;
    }
    
    pre {
        white-space: pre-wrap;
        word-wrap: break-word;
    }
</style>