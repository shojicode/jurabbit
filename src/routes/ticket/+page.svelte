<script lang="ts">
    import { onMount } from 'svelte';

    let selectedDino: string = '';
    let nickname: string = '';
    let message: string = '';

    async function submitForm() {
        if (!selectedDino || !nickname) {
        message = 'すべての項目を入力してください。';
        return;
        }

        const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            nickname,
            choice: selectedDino
        })
        });

        if (res.ok) {
        message = '送信が完了しました！';
        nickname = '';
        selectedDino = '';
        } else {
        message = '送信中にエラーが発生しました';
        }
    }
</script>


<h1>特別営業のルール</h1>
・ほげほげほげほげ<br>
・ほげほげほげ<br>
・ほげほげ<br>

<h1>次の競竜ランナーたち</h1>
<ol>
    {#each ['ティラノサウルス', 'トリケラトプス', 'ステゴサウルス', 'ヴェロキラプトル', 'ブラキオサウルス', 'アンキロサウルス'] as dino, index}
        <li>{index + 1}. {dino}</li>
    {/each}
</ol>


<h1>竜券購入</h1>
<form on:submit|preventDefault={submitForm}>
    <label>
        ニックネーム：
        <input type="text" bind:value={nickname} required />
    </label>

    <label>
        勝つと思う恐竜を選んでください：
        <select bind:value={selectedDino} required>
        <option value="" disabled selected>選択してください</option>
        <option value="1">1. ティラノサウルス</option>
        <option value="2">2. トリケラトプス</option>
        <option value="3">3. ステゴサウルス</option>
        <option value="4">4. ヴェロキラプトル</option>
        <option value="5">5. ブラキオサウルス</option>
        <option value="6">6. アンキロサウルス</option>
        </select>
    </label>

    <button type="submit">送信</button>
</form>

{#if message}
    <p>{message}</p>
{/if}

<h1>結果発表</h1>
発表まで今しばらくお待ちください<br>


<h1>過去の結果</h1>

