<script lang="ts">
  import { enhance } from '$app/forms';
  import PrimaryButton from '$ui/PrimaryButton.svelte';
  import FormField from '$ui/FormField.svelte';

  export let form: any;

  let email = '';
  let password = '';
  let isLoading = false;
</script>

<svelte:head>
  <title>Login — Cardap ERP</title>
</svelte:head>

<div class="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-900 font-sans select-none">
  <div class="max-w-md w-full bg-white border-2 border-slate-900 shadow-[12px_12px_0_rgba(220,38,38,0.2)] p-8 space-y-6 rounded-none">
    
    <!-- Brand Header -->
    <div class="text-center space-y-2 pb-4 border-b border-slate-200">
      <div class="w-14 h-14 bg-red-600 border-2 border-red-700 text-white font-mono font-extrabold text-2xl flex items-center justify-center mx-auto shadow-sm">
        C
      </div>
      <h1 class="font-mono text-xl font-bold tracking-widest text-slate-900 uppercase">
        CARDAP ERP
      </h1>
      <span class="text-xs font-mono text-slate-500 font-bold uppercase tracking-wider block">
        Painel de Gestão & Frente de Caixa
      </span>
    </div>

    {#if form?.error}
      <div class="p-3.5 bg-red-50 border-2 border-red-600 text-red-900 font-mono text-xs font-bold uppercase flex items-center gap-2">
        <span>⚠️</span>
        <span>{form.error}</span>
      </div>
    {/if}

    <!-- Formulário Nativo de Autenticação Segura -->
    <form
      method="POST"
      use:enhance={() => {
        isLoading = true;
        return async ({ update }) => {
          isLoading = false;
          await update();
        };
      }}
      class="space-y-4 font-mono text-xs"
    >
      <FormField
        label="E-mail de Acesso:"
        name="email"
        type="email"
        bind:value={email}
        placeholder="seu-email@dominio.com.br"
        mono
        required
      />

      <FormField
        label="Senha:"
        name="password"
        type="password"
        bind:value={password}
        placeholder="••••••••"
        mono
        required
      />

      <div class="pt-2">
        <PrimaryButton type="submit" variant="primary" shortcut="↵" fullWidth>
          {isLoading ? 'AUTENTICANDO NO BANCO...' : 'ENTRAR NO SISTEMA'}
        </PrimaryButton>
      </div>
    </form>

    <div class="pt-4 border-t border-slate-200 text-center font-mono text-[10px] text-slate-400 uppercase">
      Acesso restrito a operadores e administradores autorizados.
    </div>
  </div>
</div>
