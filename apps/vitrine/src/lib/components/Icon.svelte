<script lang="ts">
  export let name: string = 'info';
  export let size: number | string = 20;
  export let className: string = '';
  export let strokeWidth: number = 2;

  $: sizePx = typeof size === 'number' ? `${size}px` : size;
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width={sizePx}
  height={sizePx}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width={strokeWidth}
  stroke-linecap="round"
  stroke-linejoin="round"
  class="inline-block shrink-0 align-middle {className}"
  aria-hidden="true"
>
  {#if name === 'location' || name === 'map-pin'}
    <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
    <circle cx="12" cy="10" r="3" />
  {:else if name === 'info' || name === 'info-circle'}
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  {:else if name === 'delivery' || name === 'scooter'}
    <path d="M5 17a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
    <path d="M15 17a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
    <path d="M5 9l2 -4h7l3 4v6h-1" />
    <path d="M9 17h6" />
    <path d="M13 6h-2" />
  {:else if name === 'clock' || name === 'time'}
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  {:else if name === 'currency' || name === 'dollar'}
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  {:else if name === 'menu' || name === 'utensils'}
    <path d="M18 2v6a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V2" />
    <path d="M12 2v20" />
    <path d="M6 2v4" />
    <path d="M18 2v4" />
  {:else if name === 'coupon' || name === 'ticket' || name === 'tag'}
    <path d="M4 8.5a2.5 2.5 0 1 0 0 5V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5.5a2.5 2.5 0 1 0 0-5V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3.5z" />
    <line x1="9" y1="12" x2="15" y2="12" />
  {:else if name === 'orders' || name === 'clipboard'}
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <line x1="9" y1="12" x2="15" y2="12" />
    <line x1="9" y1="16" x2="13" y2="16" />
  {:else if name === 'user' || name === 'account'}
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  {:else if name === 'fire' || name === 'flame'}
    <path d="M12 2c0 3.5-3 5.5-3 8.5 0 3.3 2.7 6 6 6 1.8 0 3.3-.8 4.3-2.1.4 1.6 0 3.6-1.3 4.9C16.3 21 14.2 22 12 22c-4.4 0-8-3.6-8-8 0-4 3.5-7.5 8-12z" />
  {:else if name === 'burger'}
    <path d="M4 11h16a1 1 0 0 0 1-1A6 6 0 0 0 3 10a1 1 0 0 0 1 1z" />
    <path d="M3 14h18" />
    <path d="M4 17h16a2 2 0 0 1 2 2v1H2v-1a2 2 0 0 1 2-2z" />
  {:else if name === 'fries'}
    <path d="M5 11l2 11h10l2-11" />
    <path d="M7 11V3h2v8" />
    <path d="M11 11V2h2v9" />
    <path d="M15 11V4h2v7" />
  {:else if name === 'cheese'}
    <path d="M3 14l9-9 9 9H3z" />
    <path d="M3 14v6a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6" />
    <circle cx="9" cy="17" r="1" />
    <circle cx="15" cy="16" r="1.5" />
  {:else if name === 'drink' || name === 'soda'}
    <path d="M6 9l1.5 12h9L18 9H6z" />
    <path d="M4 6h16v3H4z" />
    <line x1="12" y1="2" x2="14" y2="6" />
  {:else if name === 'bottle' || name === 'water'}
    <path d="M10 2h4v3h-4z" />
    <path d="M9 5h6v3l2 3v10a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V11l2-3V5z" />
  {:else if name === 'beer'}
    <path d="M7 11v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-9" />
    <path d="M17 12h2a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2" />
    <path d="M6 7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4H6V7z" />
  {:else if name === 'calendar'}
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  {:else if name === 'credit-card' || name === 'card'}
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  {:else if name === 'search'}
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  {:else if name === 'check'}
    <polyline points="20 6 9 17 4 12" />
  {:else if name === 'arrow-left'}
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  {:else if name === 'arrow-right'}
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  {:else if name === 'chevron-right'}
    <polyline points="9 18 15 12 9 6" />
  {:else if name === 'chevron-left'}
    <polyline points="15 18 9 12 15 6" />
  {:else}
    <!-- Fallback icon: circle -->
    <circle cx="12" cy="12" r="8" />
  {/if}
</svg>
