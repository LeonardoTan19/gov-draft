<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { usePaginator } from '../../composables/usePaginator'
import { useRuleStore } from '../../stores/rule'

const props = defineProps<{
	html: string
}>()

const ruleStore = useRuleStore()
const measureContentRef = ref<HTMLElement | null>(null)
const stageRef = ref<HTMLElement | null>(null)
const previewScale = ref(1)
const { pages, paginate } = usePaginator()
let stageResizeObserver: ResizeObserver | null = null

const dragState = {
  active: false,
  startX: 0,
  startY: 0,
  startScrollLeft: 0,
  startScrollTop: 0
}

const styleFingerprint = computed(() => ruleStore.getRuleCssText)
const stageStyle = computed(() => ({
  '--preview-scale': `${previewScale.value}`
}))

const repaginate = async (): Promise<void> => {
	await paginate(props.html, measureContentRef.value)
  await nextTick()
  centerStageOnSmallScreen()
}

const requestRepaginate = () => {
  void repaginate()
}

const getStageHorizontalPadding = (stage: HTMLElement): number => {
  const computedStyle = window.getComputedStyle(stage)
  const paddingLeft = Number.parseFloat(computedStyle.paddingLeft || '0')
  const paddingRight = Number.parseFloat(computedStyle.paddingRight || '0')
  return paddingLeft + paddingRight
}

const updatePreviewScale = () => {
  const stage = stageRef.value
  const measureSheet = measureContentRef.value?.closest('.paper-sheet') as HTMLElement | null
  if (!stage || !measureSheet) {
    previewScale.value = 1
    return
  }

  const availableWidth = stage.clientWidth - getStageHorizontalPadding(stage)
  const paperWidth = measureSheet.offsetWidth
  if (availableWidth <= 0 || paperWidth <= 0) {
    previewScale.value = 1
    return
  }

  const nextScale = Math.min(1, availableWidth / paperWidth)
  previewScale.value = Number.isFinite(nextScale) ? Math.max(nextScale, 0.45) : 1
}

const handleResize = () => {
  updatePreviewScale()
  requestRepaginate()
}

const centerStageOnSmallScreen = () => {
  const stage = stageRef.value
  if (!stage || window.innerWidth > 1024) {
    return
  }

  const nextScrollLeft = Math.max((stage.scrollWidth - stage.clientWidth) / 2, 0)
  stage.scrollLeft = nextScrollLeft
}

const handleStagePointerDown = (event: PointerEvent) => {
  if (event.pointerType !== 'mouse') {
    return
  }

  if (event.button !== 0) {
    return
  }

  const targetNode = event.target as Node | null
  const targetElement =
    targetNode instanceof Element
      ? targetNode
      : targetNode?.parentElement ?? null

  const previewRoot = targetElement?.closest('.preview-content')
  if (previewRoot && targetElement !== previewRoot) {
    return
  }

  const stage = stageRef.value
  if (!stage) {
    return
  }

  dragState.active = true
  dragState.startX = event.clientX
  dragState.startY = event.clientY
  dragState.startScrollLeft = stage.scrollLeft
  dragState.startScrollTop = stage.scrollTop
  stage.classList.add('is-dragging')
  stage.setPointerCapture(event.pointerId)
}

const handleStagePointerMove = (event: PointerEvent) => {
  if (!dragState.active) {
    return
  }

  const stage = stageRef.value
  if (!stage) {
    return
  }

  const deltaX = event.clientX - dragState.startX
  const deltaY = event.clientY - dragState.startY
  stage.scrollLeft = dragState.startScrollLeft - deltaX
  stage.scrollTop = dragState.startScrollTop - deltaY
}

const stopStageDrag = (event: PointerEvent) => {
  if (!dragState.active) {
    return
  }

  const stage = stageRef.value
  dragState.active = false
  if (!stage) {
    return
  }

  stage.classList.remove('is-dragging')
  if (stage.hasPointerCapture(event.pointerId)) {
    stage.releasePointerCapture(event.pointerId)
  }
}

onMounted(() => {
	window.addEventListener('resize', handleResize)
	stageResizeObserver = new ResizeObserver(() => {
    updatePreviewScale()
  })
  if (stageRef.value) {
    stageResizeObserver.observe(stageRef.value)
  }
	updatePreviewScale()
  requestRepaginate()
})

onBeforeUnmount(() => {
	window.removeEventListener('resize', handleResize)
  stageResizeObserver?.disconnect()
  stageResizeObserver = null
})

watch(
	() => props.html,
  () => {
    requestRepaginate()
  }
)

watch(styleFingerprint, () => {
  requestRepaginate()
})
</script>

<template>
  <div
    ref="stageRef"
    class="paper-stage"
    :style="stageStyle"
    @pointerdown="handleStagePointerDown"
    @pointermove="handleStagePointerMove"
    @pointerup="stopStageDrag"
    @pointercancel="stopStageDrag"
  >
    <div class="paper-stack">
      <article
        v-for="(pageHtml, index) in pages"
        :key="index"
        :data-page-index="index + 1"
        class="paper-sheet paper-page preview-content"
        v-html="pageHtml"
      />
    </div>
  </div>

  <div
    class="paper-measure"
    aria-hidden="true"
  >
    <article class="paper-sheet paper-measure__sheet">
      <div
        ref="measureContentRef"
        class="preview-content paper-measure__content"
      />
    </article>
  </div>
</template>
