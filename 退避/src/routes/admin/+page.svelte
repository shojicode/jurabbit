<h1>オペレータ用ページ</h1>

<script lang="ts">
    let url = '';
</script>

<h1>イベント用URLの設定</h1>
<form method="POST" action="?/update">
  <input type="url" name="url" bind:value={url} placeholder="https://example.com" required />
  <button type="submit">保存</button>
</form>
