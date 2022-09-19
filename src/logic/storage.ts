import { useStorageLocal } from '~/composables/useStorageLocal'
import { getBrowserLanguage } from '~/logic/detectLanguage'
const detectedUserLanguage = getBrowserLanguage()
console.log('detectedUserLanguage', detectedUserLanguage)

export const extensionSettingsStorage = useStorageLocal('extensionSettingsStorage', {
  isSpeakWords: false,
  isSpeakSentences: false,
  isExtensionActiveInAllTabs: false,

}, { listenToStorageChanges: true })

export const userStorage = useStorageLocal('userStorage', {
  language: detectedUserLanguage,
}, { listenToStorageChanges: true })

export interface TabInfo {
  id: number
  language: string
}

export const tabsInfoStorage = useStorageLocal('tabsInfoStorage',
  { tabs: <TabInfo[]>[] }, { listenToStorageChanges: true })

