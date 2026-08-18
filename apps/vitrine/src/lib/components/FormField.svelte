<script lang="ts">
  export let label: string = '';
  export let name: string = '';
  export let id: string = name ? `field-${name}` : `field-${Math.random().toString(36).substring(2, 7)}`;
  export let type: 'text' | 'password' | 'email' | 'number' | 'date' | 'tel' = 'text';
  export let value: string | number = '';
  export let placeholder: string = '';
  export let mono: boolean = false;
  export let readonly: boolean = false;
  export let loading: boolean = false;
  export let error: string = '';
  export let required: boolean = false;

  $: inputClasses = `w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors ${mono ? 'font-mono' : 'font-sans'} ${readonly ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : ''} ${error ? 'border-red-600 focus:ring-red-600' : ''}`;
</script>

<div class="space-y-1 relative">
  {#if label}
    <label for={id} class="block text-[10px] font-semibold tracking-widest uppercase text-slate-600">
      {label}
      {#if required}<span class="text-red-600 ml-0.5">*</span>{/if}
    </label>
  {/if}

  <div class="relative">
    {#if type === 'tel'}
      <input {id} {name} type="tel" bind:value {placeholder} {readonly} {required} class={inputClasses} />
    {:else if type === 'password'}
      <input {id} {name} type="password" bind:value {placeholder} {readonly} {required} class={inputClasses} />
    {:else if type === 'number'}
      <input {id} {name} type="number" bind:value {placeholder} {readonly} {required} class={inputClasses} />
    {:else if type === 'date'}
      <input {id} {name} type="date" bind:value {placeholder} {readonly} {required} class={inputClasses} />
    {:else if type === 'email'}
      <input {id} {name} type="email" bind:value {placeholder} {readonly} {required} class={inputClasses} />
    {:else}
      <input {id} {name} type="text" bind:value {placeholder} {readonly} {required} class={inputClasses} />
    {/if}

    {#if loading}
      <div class="absolute right-2.5 top-1/2 -translate-y-1/2">
        <span class="h-3 w-3 animate-spin border-2 border-red-600 border-t-transparent inline-block"></span>
      </div>
    {/if}
  </div>

  {#if error}
    <div class="border border-red-600 bg-red-50 px-2 py-1 font-mono text-[10px] font-bold tracking-wider text-red-700 uppercase">
      ⚠ {error}
    </div>
  {/if}
</div>
