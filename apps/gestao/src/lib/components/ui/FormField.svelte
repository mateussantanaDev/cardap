<script lang="ts">
  export let label: string;
  export let name: string;
  export let id: string = name;
  export let type: string = 'text';
  export let value: string | number = '';
  export let placeholder: string = '';
  export let mono: boolean = false;
  export let required: boolean = false;
  export let disabled: boolean = false;
  export let readonly: boolean = false;
  export let error: string | undefined = undefined;
  export let helpText: string | undefined = undefined;
</script>

<div class="space-y-1">
  <label for={id} class="block font-mono text-[10px] font-bold uppercase tracking-widest text-slate-700">
    {label} {#if required}<span class="text-red-600">*</span>{/if}
  </label>

  {#if type === 'number'}
    <input
      {id}
      {name}
      type="number"
      {placeholder}
      {required}
      {disabled}
      {readonly}
      bind:value
      class="w-full px-3 py-2 bg-white border rounded-none text-xs text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 disabled:bg-slate-50 disabled:text-slate-400 readonly:bg-slate-50 {mono ? 'font-mono' : 'font-sans'} {error ? 'border-red-600 bg-red-50' : 'border-slate-300'}"
      on:input
      on:change
    />
  {:else if type === 'password'}
    <input
      {id}
      {name}
      type="password"
      {placeholder}
      {required}
      {disabled}
      {readonly}
      bind:value
      class="w-full px-3 py-2 bg-white border rounded-none text-xs text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 disabled:bg-slate-50 disabled:text-slate-400 readonly:bg-slate-50 {mono ? 'font-mono' : 'font-sans'} {error ? 'border-red-600 bg-red-50' : 'border-slate-300'}"
      on:input
      on:change
    />
  {:else}
    <input
      {id}
      {name}
      type="text"
      {placeholder}
      {required}
      {disabled}
      {readonly}
      bind:value
      class="w-full px-3 py-2 bg-white border rounded-none text-xs text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 disabled:bg-slate-50 disabled:text-slate-400 readonly:bg-slate-50 {mono ? 'font-mono' : 'font-sans'} {error ? 'border-red-600 bg-red-50' : 'border-slate-300'}"
      on:input
      on:change
    />
  {/if}

  {#if error}
    <p class="font-mono text-[11px] text-red-600 font-semibold">{error}</p>
  {:else if helpText}
    <p class="font-mono text-[11px] text-slate-500">{helpText}</p>
  {/if}
</div>
