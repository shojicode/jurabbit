<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>
Togetan is cutest creature in the world!!!!


<script lang="ts">
  import type { PageProps } from './$types';
  const {data}: PageProps = $props();
</script>

{data.content}