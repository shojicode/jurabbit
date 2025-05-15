<svelte:head>
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
</svelte:head>


<script lang="ts">
	import '../app.css';
	
	let { children } = $props();
</script>

<header class="shadow-emerald-100 shadow-md">
	<div class="bg-emerald-800">
		<div class="font-bold text-4xl text-white p-4">
			<a href="/">Jurabbit</a>
		</div>
	</div>
</header>

{@render children()}
