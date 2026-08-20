<script lang="ts">
  import { enhance } from '$app/forms';
  import { authStore, type UserRole } from '$stores/authStore';
  import PrimaryButton from '$ui/PrimaryButton.svelte';
  import FormField from '$ui/FormField.svelte';

  export let form: any;

  let email = 'admin@cardap.app';
  let password = 'admin123';
  let selectedRole: UserRole = 'ADMIN';
  let isLoading = false;

  function selectRole(role: UserRole) {
    selectedRole = role;
    if (role === 'ADMIN') {
      email = 'admin@cardap.app';
      password = 'admin123';
    } else if (role === 'COZINHA') {
      email = 'cozinha@imperiusdopastel.com.br';
      password = 'password123';
    } else if (role === 'CAIXA') {
      email = 'caixa@imperiusdopastel.com.br';
      password = 'password123';
    }
  }
</script>

<div class="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-900 font-sans">
  <div class="max-w-md w-full bg-white border-2 border-slate-900 shadow-[12px_12px_0_rgba(220,38,38,0.2)] p-6 space-y-6 rounded-none">
    
    <!-- Brand Header -->
    <div class="text-center space-y-2 pb-4 border-b border-slate-200">
      <div class="w-14 h-14 bg-red-600 border-2 border-red-700 text-white font-mono font-extrabold text-2xl flex items-center justify-center mx-auto shadow-sm">
        C
      </div>
      <h1 class="font-mono text-lg font-bold tracking-widest text-slate-900 uppercase">
        CARDAP ERP — LOGIN
      </h1>
      <span class="text-xs font-mono text-slate-500 font-bold uppercase tracking-wider block">
        SISTEMA DE GESTÃO OPERACIONAL B2B
      </span>
    </div>

    {#if form?.error}
      <div class="p-3 bg-red-50 border-2 border-red-600 text-red-900 font-mono text-xs font-bold uppercase">
        ⚠️ {form.error}
      </div>
    {/if}

    <!-- Seletor Rápido de Perfil RBAC para Demo -->
    <div class="space-y-2 font-mono text-xs">
      <span class="text-[10px] uppercase font-bold text-slate-600 tracking-widest block">
        SELECIONE O PERFIL DE ACESSO DA SESSÃO:
      </span>
      <div class="grid grid-cols-3 gap-2">
        <button
          type="button"
          class="p-2 border-2 text-left transition-all cursor-pointer {selectedRole === 'ADMIN' ? 'bg-red-600 text-white border-red-700 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}"
          on:click={() => selectRole('ADMIN')}
        >
          <div class="text-[10px] uppercase font-bold">🔴 ADMIN</div>
          <div class="text-[9px] opacity-80 font-sans">Acesso Total</div>
        </button>

        <button
          type="button"
          class="p-2 border-2 text-left transition-all cursor-pointer {selectedRole === 'CAIXA' ? 'bg-red-600 text-white border-red-700 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}"
          on:click={() => selectRole('CAIXA')}
        >
          <div class="text-[10px] uppercase font-bold">💳 CAIXA / PDV</div>
          <div class="text-[9px] opacity-80 font-sans">Turno & Vendas</div>
        </button>

        <button
          type="button"
          class="p-2 border-2 text-left transition-all cursor-pointer {selectedRole === 'COZINHA' ? 'bg-red-600 text-white border-red-700 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}"
          on:click={() => selectRole('COZINHA')}
        >
          <div class="text-[10px] uppercase font-bold">👨‍🍳 COZINHA</div>
          <div class="text-[9px] opacity-80 font-sans">Kanban KDS</div>
        </button>
      </div>
    </div>

    <!-- Native SvelteKit Form with Server Actions -->
    <form
      method="POST"
      use:enhance={() => {
        isLoading = true;
        authStore.loginAs(selectedRole);
        return async ({ update }) => {
          isLoading = false;
          await update();
        };
      }}
      class="space-y-4 font-mono text-xs"
    >
      <input type="hidden" name="role" value={selectedRole} />

      <FormField
        label="E-mail de Operador:"
        name="email"
        type="email"
        bind:value={email}
        placeholder="admin@cardap.app"
        mono
        required
      />

      <FormField
        label="Senha de Acesso:"
        name="password"
        type="password"
        bind:value={password}
        mono
        required
      />

      <div class="pt-2">
        <PrimaryButton type="submit" variant="primary" shortcut="↵" fullWidth>
          {isLoading ? 'AUTENTICANDO...' : 'ENTRAR NO SISTEMA ERP'}
        </PrimaryButton>
      </div>
    </form>

    <div class="pt-3 border-t border-slate-200 text-center font-mono text-[10px] text-slate-400 uppercase">
      CARDAP v2.0.0 · AUTENTICAÇÃO DIRETA SEGURA
    </div>
  </div>
</div>
