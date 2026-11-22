<script lang="ts">
	import { page } from '$app/state';

	const AREAS = [
		{ href: '/', label: 'Werkbank' },
		{ href: '/holz', label: 'Holzlabel' },
		{ href: '/papier', label: 'Papierlabel' }
	] as const;
</script>

<header class="mx-auto flex max-w-[1400px] items-center justify-center gap-4 px-4 py-4 sm:justify-between sm:px-6">
	<a href="/" class="hidden min-h-11 items-center font-ui-head text-base tracking-tight text-ink sm:flex">Kura</a>
	<nav class="flex gap-1 rounded-full bg-sand p-1 text-sm" aria-label="Bereiche">
		{#each AREAS as area (area.href)}
			{@const current = area.href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(area.href)}
			<a
				href={area.href}
				class="flex min-h-11 items-center rounded-full px-3 sm:px-4 {current ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}"
				aria-current={current ? 'page' : undefined}>{area.label}</a
			>
		{/each}
	</nav>
</header>
