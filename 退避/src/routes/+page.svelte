<script lang="ts">
  import type { PageProps } from './$types';
  const { data }: { data: { eventUrl: string } } & PageProps = $props();
</script>


<h1>整理券システムについてのご案内</h1>
<p>本企画では整理券システム <a href="https://matene.jp/">MATENE</a> を使用しております</p>
お手持ちの整理券番号を以下のサイトに入力してください
<p>整理券番号を入力することで、あなたの整理券番号が何番目かを確認できます</p>
<p>また、メアド登録すると通知来て便利だよ。そのメアドは僕らはわからないから安心してね</p>
<p><a href="{data.eventUrl}" target="_blank">{data.eventUrl}</a></p> <!-- 管理者サイトで変更ができるように実装完了 -->

<!-- 管理者サイトで変更できるように実装完了 -->
<iframe
  src="{data.eventUrl}"
  width="100%"
  height="400"
  style="border: 1px solid #ccc; border-radius: 8px;"
  title="MATENE 整理券入力画面"
></iframe>

<h1>通常営業！時間帯ごとに3つの企画</h1>
1つ目〜〜〜<br>
2つ目〜〜〜<br>
3つ目〜〜〜<br>

<h1>特別営業！競竜のご案内</h1>
<p>競馬ならぬ競竜？！</p>
<p>恐竜と人間？が走ります</p>
<h2>特別営業のスケジュール</h2>
<a href="#">竜券購入サイトはこちら</a>




