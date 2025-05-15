<script lang="ts">
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { API_URL } from '$lib';

  const isAuthenticated = writable(false);
  const password = writable('');
  const error = writable('');
  const isLoading = writable(false);

  // マウント時に認証状態を確認
  onMount(async () => {
    try {
      const response = await fetch(API_URL.get.admin_verify, {
        credentials: 'include'
      });
      if (response.ok) {
        isAuthenticated.set(true);
      }
    } catch (e) {
      console.error('Auth verification error:', e);
    }
  });

  // ログイン処理
  async function handleLogin() {
    error.set('');
    isLoading.set(true);
    
    try {
      const response = await fetch(API_URL.post.admin_login, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: $password }),
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        isAuthenticated.set(true);
        password.set('');
      } else {
        error.set(data.error || '認証に失敗しました。');
      }
    } catch (e) {
      error.set('ネットワークエラーが発生しました。');
      console.error('Login error:', e);
    } finally {
      isLoading.set(false);
    }
  }

  // ログアウト処理
  async function handleLogout() {
    try {
      await fetch(API_URL.post.admin_logout, {
        method: 'POST',
        credentials: 'include'
      });
      isAuthenticated.set(false);
    } catch (e) {
      console.error('Logout error:', e);
    }
  }
</script>

{#if $isAuthenticated}
  <div class="mb-6 flex justify-between items-center">
    <p class="text-green-600 font-medium">✓ 管理者として認証されています</p>
    <button 
      on:click={handleLogout}
      class="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
      disabled={$isLoading}
    >
      ログアウト
    </button>
  </div>
  <slot></slot>
{:else}
  <div class="bg-gray-100 p-6 rounded-lg shadow-md max-w-md mx-auto my-8">
    <h2 class="text-xl font-bold mb-4">管理者認証</h2>
    
    {#if $error}
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
        <p>{$error}</p>
      </div>
    {/if}
    
    <form on:submit|preventDefault={handleLogin} class="space-y-4">
      <div>
        <label for="password" class="block text-gray-700 mb-2">パスワード</label>
        <input 
          type="password" 
          id="password"
          bind:value={$password}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>
      
      <button 
        type="submit"
        class="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
        disabled={$isLoading}
      >
        {$isLoading ? 'ログイン中...' : 'ログイン'}
      </button>
    </form>
  </div>
{/if}