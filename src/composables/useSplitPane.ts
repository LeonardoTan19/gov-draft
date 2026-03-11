import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { ComponentPublicInstance } from 'vue'

interface UseSplitPaneOptions {
  minPanelWidth?: number
  mobileBreakpoint?: number
  initialEditorWidthPercent?: number
}

const DEFAULT_MIN_PANEL_WIDTH = 360
const DEFAULT_MOBILE_BREAKPOINT = 1024
const DEFAULT_INITIAL_EDITOR_WIDTH = 50

export function useSplitPane(options: UseSplitPaneOptions = {}) {
  const minPanelWidth = options.minPanelWidth ?? DEFAULT_MIN_PANEL_WIDTH
  const mobileBreakpoint = options.mobileBreakpoint ?? DEFAULT_MOBILE_BREAKPOINT
  const initialEditorWidthPercent =
    options.initialEditorWidthPercent ?? DEFAULT_INITIAL_EDITOR_WIDTH

  const workspaceRef = ref<HTMLElement | null>(null)
  const editorWidthPercent = ref(initialEditorWidthPercent)
  const isResizing = ref(false)

  const workspaceStyle = computed(() => ({
    '--editor-width': `${editorWidthPercent.value}%`
  }))

  const bindWorkspace = (
    element: Element | ComponentPublicInstance | null
  ) => {
    if (element instanceof HTMLElement) {
      workspaceRef.value = element
      return
    }

    if (element && '$el' in element) {
      const hostElement = element.$el
      workspaceRef.value = hostElement instanceof HTMLElement ? hostElement : null
      return
    }

    workspaceRef.value = null
  }

  const clampPercent = (rawPercent: number, containerWidth: number) => {
    const minPercent = Math.min((minPanelWidth / containerWidth) * 100, 49)
    const maxPercent = 100 - minPercent
    return Math.max(minPercent, Math.min(maxPercent, rawPercent))
  }

  const updateSplitByClientX = (clientX: number) => {
    const workspace = workspaceRef.value
    if (!workspace) {
      return
    }

    const rect = workspace.getBoundingClientRect()
    if (rect.width <= 0) {
      return
    }

    const rawPercent = ((clientX - rect.left) / rect.width) * 100
    editorWidthPercent.value = clampPercent(rawPercent, rect.width)
  }

  const startResize = (event: PointerEvent) => {
    if (window.innerWidth <= mobileBreakpoint) {
      return
    }

    isResizing.value = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    updateSplitByClientX(event.clientX)
  }

  const handlePointerMove = (event: PointerEvent) => {
    if (!isResizing.value) {
      return
    }

    updateSplitByClientX(event.clientX)
  }

  const stopResize = () => {
    if (!isResizing.value) {
      return
    }

    isResizing.value = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  onMounted(() => {
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopResize)
    window.addEventListener('pointercancel', stopResize)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', stopResize)
    window.removeEventListener('pointercancel', stopResize)
    stopResize()
  })

  return {
    bindWorkspace,
    workspaceStyle,
    startResize
  }
}
