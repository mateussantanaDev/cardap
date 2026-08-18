<script lang="ts">
  import '../app.css';
  import { TENANT_DATABASE } from '$stores/tenantVitrineStore';
  import PrimaryButton from '$components/PrimaryButton.svelte';

  const tenants = Object.values(TENANT_DATABASE);
</script>

<div class="max-w-2xl mx-auto min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 font-sans select-none">
  <div class="space-y-6">
    <!-- Platform Header -->
    <div class="text-center space-y-2 pt-6 pb-6 border-b border-slate-800">
      <div class="w-16 h-16 bg-red-600 border-2 border-red-700 text-white font-mono font-extrabold text-3xl flex items-center justify-center mx-auto shadow-lg">
        C
      </div>
      <h1 class="font-mono text-xl font-bold tracking-widest text-white uppercase">
        CARDAP — CARDÁPIO DIGITAL SAAS
      </h1>
      <span class="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider block">
        ENCONTRE SEU RESTAURANTE FAVORITO E FAÇA SEU PEDIDO
      </span>
    </div>

    <!-- Lista de Restaurantes / Tenants Disponíveis na Plataforma -->
    <div class="space-y-3 font-mono text-xs">
      <span class="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">
        ESTABELECIMENTOS PARCEIROS REGISTRADOS:
      </span>

      <div class="space-y-3">
        {#each tenants as t}
          <a
            href={`/${t.slug}`}
            class="block p-4 bg-slate-900 border-2 border-slate-800 hover:border-red-600 transition-all rounded-none group"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-sm text-white group-hover:text-red-500 uppercase">{t.name}</span>
                  <span class="px-1.5 py-0.5 bg-emerald-950 border border-emerald-700 text-emerald-400 text-[9px] font-bold">
                    ABERTO
                  </span>
                </div>
                <div class="text-xs text-slate-400 font-sans">{t.category}</div>
                <div class="text-[10px] text-slate-500 font-mono pt-1">
                  ⏱️ {t.slaText} · 🛵 {t.deliveryFeeText} · {t.rating}
                </div>
              </div>

              <div class="px-3 py-1.5 bg-red-600 group-hover:bg-red-700 text-white font-bold text-[10px] uppercase shrink-0">
                VER CARDÁPIO ➔
              </div>
            </div>
          </a>
        {/each}
      </div>
    </div>
  </div>

  <div class="pt-6 border-t border-slate-900 text-center font-mono text-[10px] text-slate-500 uppercase">
    CARDAP SAAS PLATFORM v2.0.0 · DIREITOS RESERVADOS
  </div>
</div>
