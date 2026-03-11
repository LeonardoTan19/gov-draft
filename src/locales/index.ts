import { createI18n } from 'vue-i18n'
import en from './en.json'
import zhCN from './zh-CN.json'

const LOCALE_STORAGE_KEY = 'gov-draft-locale'
const SUPPORTED_LOCALES = ['en', 'zh-CN'] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

const isSupportedLocale = (locale: string): locale is SupportedLocale => {
	return SUPPORTED_LOCALES.includes(locale as SupportedLocale)
}

const resolveInitialLocale = (): SupportedLocale => {
	if (typeof window === 'undefined') {
		return 'zh-CN'
	}

	const savedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY)
	if (savedLocale && isSupportedLocale(savedLocale)) {
		return savedLocale
	}

	return 'zh-CN'
}

const initialLocale = resolveInitialLocale()

export const i18n = createI18n({
	legacy: false,
	locale: initialLocale,
	fallbackLocale: 'zh-CN',
	messages: {
		en,
		'zh-CN': zhCN
	}
})

export const setLocale = (locale: SupportedLocale): void => {
  i18n.global.locale.value = locale

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  }

  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale
  }
}

if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLocale
}

