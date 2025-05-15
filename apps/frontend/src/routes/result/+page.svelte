<script lang="ts">
    import { onMount } from 'svelte';
    import { API_URL } from '$lib';
    
    interface Dino {
        id: number;
        name: string;
        description: string;
    }
    
    interface BetResult {
        userId: string;
        raceId: number;
        firstChoice: number;
        secondChoice: number | null;
        thirdChoice: number | null;
    }
    
    interface RaceResult {
        horseId: number;
        rank: number;
    }
    
    // 状態管理
    let raceId: number | null = null;
    let userBet: BetResult | null = null;
    let raceResults: RaceResult[] = [];
    let dinos: Dino[] = [];
    let error: string | null = null;
    let isLoading = false;
    let isRefreshing = false;
    
    // 判定結果
    let judgementResult: {
        status: '当選' | '惜しい' | 'がんばった' | '残念';
        matchCount: number;
        details: {position: number, matched: boolean, prediction: number, actual: number | null}[];
    } | null = null;
    
    onMount(async () => {
        try {
            // 恐竜データを取得
            await fetchDinoData();
            
            // URLからraceIdを取得する
            const urlParams = new URLSearchParams(window.location.search);
            const urlRaceId = urlParams.get('raceId');
            
            if (urlRaceId && !isNaN(parseInt(urlRaceId))) {
                // URLパラメータからレースIDを取得した場合
                raceId = parseInt(urlRaceId);
                await fetchResults();
            } else {
                // URLパラメータがない場合は最新のレースIDを取得
                await fetchLatestRaceId();
            }
        } catch (err) {
            error = 'データの初期化に失敗しました: ' + (err instanceof Error ? err.message : String(err));
        }
    });
    
    // 最新のレースIDを取得する関数
    async function fetchLatestRaceId() {
        try {
            const response = await fetch(API_URL.get.current_race);
            
            if (response.ok) {
                const data = await response.json();
                if (data && data.currentRaceId) {
                    raceId = parseInt(data.currentRaceId);
                    await fetchResults();
                } else {
                    error = '有効なレースIDが取得できませんでした';
                }
            } else {
                error = '最新のレースIDを取得できませんでした';
            }
        } catch (err) {
            error = 'レースID取得エラー: ' + (err instanceof Error ? err.message : String(err));
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
    
    // ユーザーの予想と結果を取得
    async function fetchResults() {
        if (!raceId) {
            error = 'レースIDが指定されていません';
            return;
        }
        
        isLoading = true;
        error = null;
        
        try {
            // 1. ユーザーの予想を取得
            const betResponse = await fetch(`${API_URL.get.user_prediction}/${raceId}`, {
                credentials: 'include' // Cookieを送信
            });
            
            if (!betResponse.ok) {
                if (betResponse.status === 404) {
                    error = 'このレースの予想が見つかりませんでした';
                } else {
                    error = 'あなたの予想を取得できませんでした';
                }
                return;
            }
            
            const betData = await betResponse.json();
            userBet = betData.bet;
            
            // 2. レース結果を取得
            const resultResponse = await fetch(`${API_URL.get.results}/${raceId}`);
            
            if (!resultResponse.ok) {
                if (resultResponse.status === 404) {
                    error = 'このレースの結果がまだ発表されていません';
                } else {
                    error = 'レース結果を取得できませんでした';
                }
                return;
            }
            
            raceResults = await resultResponse.json();
            
            // 結果の照合
            judgeResults();
            
        } catch (err) {
            error = 'データ取得エラー: ' + (err instanceof Error ? err.message : String(err));
        } finally {
            isLoading = false;
        }
    }
    
    // 手動で検索する場合のハンドラ
    function handleSearch() {
        if (raceId) {
            fetchResults();
        } else {
            error = 'レースIDを入力してください';
        }
    }
    
    // 結果を再読み込みするための関数
    async function refreshResults() {
        if (!raceId) {
            error = 'レースIDが指定されていません';
            return;
        }
        
        isRefreshing = true;
        error = null;
        
        try {
            await fetchResults();
        } catch (err) {
            error = 'データ更新エラー: ' + (err instanceof Error ? err.message : String(err));
        } finally {
            isRefreshing = false;
        }
    }
    
    // 予想と結果を照合し判定する
    function judgeResults() {
        if (!userBet || raceResults.length === 0) return;
        
        // 予想した馬のID
        const predictions = [
            userBet.firstChoice,
            userBet.secondChoice,
            userBet.thirdChoice
        ].filter((id): id is number => id !== null);
        
        // 実際の結果（順位ごとの馬ID）
        const actualResults = new Map<number, number>();
        raceResults.forEach(result => {
            actualResults.set(result.rank, result.horseId);
        });
        
        // 各順位ごとの一致チェック
        const details = [
            {
                position: 1,
                prediction: userBet.firstChoice,
                actual: actualResults.get(1) || null,
                matched: userBet.firstChoice === actualResults.get(1)
            },
            {
                position: 2,
                prediction: userBet.secondChoice || 0,
                actual: actualResults.get(2) || null,
                matched: userBet.secondChoice === actualResults.get(2)
            },
            {
                position: 3,
                prediction: userBet.thirdChoice || 0,
                actual: actualResults.get(3) || null,
                matched: userBet.thirdChoice === actualResults.get(3)
            }
        ];
        
        // 一致した数をカウント
        const matchCount = details.filter(d => d.matched).length;
        
        // 判定結果を設定
        let status: '当選' | '惜しい' | 'がんばった' | '残念';
        if (matchCount === 3) {
            status = '当選';
        } else if (matchCount === 2) {
            status = '惜しい';
        } else if (matchCount === 1) {
            status = 'がんばった';
        } else {
            status = '残念';
        }
        
        judgementResult = {
            status,
            matchCount,
            details
        };
    }
    
    // 恐竜の名前を取得
    function getDinoName(id: number | null): string {
        if (id === null || id === 0) return '指定なし';
        const dino = dinos.find(d => d.id === id);
        return dino ? dino.name : `不明 (ID:${id})`;
    }
</script>

<div class="max-w-4xl mx-auto p-5 font-sans">
    <h1 class="text-center text-2xl lg:text-3xl text-gray-800 font-bold mb-8">恐竜の逆鱗取り競争 結果照合</h1>
    
    <div class="mb-8 bg-white rounded-xl p-6 shadow-md">
        <h2 class="text-lg font-semibold text-gray-700 mb-4">レースIDを入力して結果を確認</h2>
        
        <div class="flex items-center gap-3">
            <input 
                type="number" 
                bind:value={raceId} 
                placeholder="レースID" 
                class="flex-1 p-3 border rounded focus:ring-2 focus:ring-blue-300 focus:outline-none" 
                min="1"
            />
            <button 
                on:click={handleSearch}
                class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded transition-colors"
                disabled={isLoading || isRefreshing}
            >
                {isLoading ? '取得中...' : '結果を確認'}
            </button>
        </div>
    </div>
    
    {#if isLoading || isRefreshing}
        <div class="text-center p-10">
            <div class="inline-block animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            <p class="mt-2 text-gray-600">{isRefreshing ? 'データを更新中...' : 'データを取得中...'}</p>
        </div>
    {:else if judgementResult}
        <div class="bg-gray-50 rounded-xl p-6 shadow-lg border-2 {
            judgementResult.status === '当選' ? 'border-yellow-400' :
            judgementResult.status === '惜しい' ? 'border-blue-400' :
            judgementResult.status === 'がんばった' ? 'border-green-400' : 'border-gray-300'
        }">
            <div class="text-center mb-6">
                <h2 class="text-xl font-bold mb-2">レース#{raceId}の結果</h2>
                <div class="inline-block px-5 py-2 rounded-full text-white font-bold text-lg {
                    judgementResult.status === '当選' ? 'bg-yellow-500' :
                    judgementResult.status === '惜しい' ? 'bg-blue-500' :
                    judgementResult.status === 'がんばった' ? 'bg-green-500' : 'bg-gray-500'
                }">
                    {judgementResult.status}！
                    <span class="text-sm">（{judgementResult.matchCount}/3一致）</span>
                </div>
                
                <!-- 更新ボタンを追加 -->
                <div class="mt-3">
                    <button 
                        class="inline-flex items-center space-x-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-1 px-3 rounded-full text-sm transition-colors"
                        on:click={refreshResults}
                        disabled={isRefreshing}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 {isRefreshing ? 'animate-spin' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>{isRefreshing ? '更新中...' : '結果を更新'}</span>
                    </button>
                </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- 予想内容 -->
                <div class="bg-white p-4 rounded-lg shadow">
                    <h3 class="text-lg font-semibold mb-3 border-b pb-2">あなたの予想</h3>
                    <ul class="space-y-3">
                        {#each [1, 2, 3] as position}
                            {@const detail = judgementResult.details.find(d => d.position === position)}
                            {#if detail}
                                <li class="flex items-center">
                                    <span class="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mr-3">{position}</span>
                                    <span class="flex-grow">{getDinoName(detail.prediction)}</span>
                                    <span class="ml-2 {detail.matched ? 'text-green-500' : 'text-red-500'}">
                                        {#if detail.matched}
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                        {:else}
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        {/if}
                                    </span>
                                </li>
                            {/if}
                        {/each}
                    </ul>
                </div>
                
                <!-- 実際の結果 -->
                <div class="bg-white p-4 rounded-lg shadow">
                    <h3 class="text-lg font-semibold mb-3 border-b pb-2">実際の結果</h3>
                    <ul class="space-y-3">
                        {#each [1, 2, 3] as position}
                            {@const detail = judgementResult.details.find(d => d.position === position)}
                            {#if detail}
                                <li class="flex items-center">
                                    <span class="w-8 h-8 bg-gray-700 text-white rounded-full flex items-center justify-center font-bold mr-3">{position}</span>
                                    <span class="flex-grow">{getDinoName(detail.actual)}</span>
                                    <span class="ml-2 {detail.matched ? 'text-green-500' : 'text-gray-400'}">
                                        {#if detail.matched}
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                        {/if}
                                    </span>
                                </li>
                            {/if}
                        {/each}
                    </ul>
                </div>
            </div>
            
            <div class="mt-6 text-center">
                {#if judgementResult.status === '当選'}
                    <div class="p-4 bg-yellow-100 text-yellow-800 rounded-lg">
                        <p class="font-bold">おめでとうございます！完全的中です！</p>
                    </div>
                {:else if judgementResult.status === '惜しい'}
                    <div class="p-4 bg-blue-100 text-blue-800 rounded-lg">
                        <p>惜しい！2つ一致しました。</p>
                    </div>
                {:else if judgementResult.status === 'がんばった'}
                    <div class="p-4 bg-green-100 text-green-800 rounded-lg">
                        <p>がんばりました！1つ一致しています。</p>
                    </div>
                {:else}
                    <div class="p-4 bg-gray-100 text-gray-800 rounded-lg">
                        <p>残念、今回は一致しませんでした。次に期待しましょう！</p>
                    </div>
                {/if}
            </div>
            
            <div class="mt-6 flex justify-center">
                <a href="/bet" class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition-colors">
                    次のレースに予想する
                </a>
            </div>
        </div>
    {:else if error}
        <div class="bg-red-100 border-l-4 border-red-500 p-4 rounded shadow-lg mb-5">
            <div class="flex items-center">
                <div class="flex-shrink-0 text-red-500">
                    <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
                    </svg>
                </div>
                <div class="ml-3">
                    <p class="text-red-700">{error}</p>
                </div>
            </div>
            
            <!-- エラー時のリロードボタン -->
            {#if raceId}
                <div class="mt-3 flex justify-center">
                    <button 
                        class="flex items-center space-x-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-3 rounded text-sm transition-colors"
                        on:click={refreshResults}
                        disabled={isRefreshing}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 {isRefreshing ? 'animate-spin' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>再読み込み</span>
                    </button>
                </div>
            {/if}
        </div>
        
        <div class="text-center mt-6">
            <p class="text-gray-600 mb-3">レースIDを入力して、あなたの予想結果を確認してください。</p>
            <a href="/bet" class="text-blue-500 hover:underline">
                まだ予想していない場合はこちらから
            </a>
        </div>
    {/if}
    
    <div class="mt-8 text-center text-gray-500 text-sm">
        <p>※結果は恐竜の逆鱗取り競争の公式記録に基づいています</p>
    </div>
</div>