<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRuleStore } from '../../stores/rule'

const props = defineProps<{
	html: string
}>()

const ruleStore = useRuleStore()
const measureContentRef = ref<HTMLElement | null>(null)
const pages = ref<string[]>([])

const styleFingerprint = computed(() => ruleStore.getRuleCssText)

const collectBlocks = (html: string): string[] => {
	const container = document.createElement('div')
	container.innerHTML = html

	return Array.from(container.childNodes).reduce<string[]>((acc, node) => {
		if (node.nodeType === Node.ELEMENT_NODE) {
			acc.push((node as Element).outerHTML)
			return acc
		}

		if (node.nodeType === Node.TEXT_NODE) {
			const text = node.textContent?.trim() ?? ''
			if (text.length > 0) {
				const p = document.createElement('p')
				p.textContent = text
				acc.push(p.outerHTML)
			}
		}

		return acc
	}, [])
}

const isOverflowing = (el: HTMLElement): boolean => {
	return el.scrollHeight - el.clientHeight > 1
}

const repaginate = async (): Promise<void> => {
	await nextTick()

	const measureContent = measureContentRef.value
	if (!measureContent) {
		return
	}

	const blocks = collectBlocks(props.html)
	if (blocks.length === 0) {
		pages.value = ['']
		measureContent.innerHTML = ''
		return
	}

	const result: string[] = []
	let currentPageHtml = ''

	for (const block of blocks) {
		const candidateHtml = `${currentPageHtml}${block}`
		measureContent.innerHTML = candidateHtml

		if (!isOverflowing(measureContent)) {
			currentPageHtml = candidateHtml
			continue
		}

		if (currentPageHtml.length === 0) {
			result.push(block)
			measureContent.innerHTML = ''
			continue
		}

		result.push(currentPageHtml)
		currentPageHtml = block
		measureContent.innerHTML = currentPageHtml
	}

	if (currentPageHtml.length > 0) {
		result.push(currentPageHtml)
	}

	pages.value = result.length > 0 ? result : ['']
	measureContent.innerHTML = ''
}

const handleResize = () => {
	void repaginate()
}

onMounted(() => {
	window.addEventListener('resize', handleResize)
	void repaginate()
})

onBeforeUnmount(() => {
	window.removeEventListener('resize', handleResize)
})

watch(
	() => props.html,
	() => {
		void repaginate()
	},
	{ immediate: true }
)

watch(styleFingerprint, () => {
	void repaginate()
})
</script>

<template>
	<div class="paper-stack">
		<article
			v-for="(pageHtml, index) in pages"
			:key="index"
			class="paper-sheet paper-page preview-content"
			v-html="pageHtml"
		/>
	</div>

	<div class="paper-measure" aria-hidden="true">
		<article class="paper-sheet paper-measure__sheet">
			<div ref="measureContentRef" class="preview-content paper-measure__content" />
		</article>
	</div>
</template>
