<script setup lang="ts">
import { onMessage, sendMessage } from 'webext-bridge'
import type Language from '../types/Language'
import { getCurrentBrowserTabId } from '~/logic/browserTabs'
import { extensionSettingsStorage, tabsInfoStorage, userStorage } from '~/logic/storage'

const currentActiveTabId = ref<number>()

const currentActiveTab = computed(() => {
  if (currentActiveTabId.value && tabsInfoStorage.value.tabs.length > 0) {
    const tabs = tabsInfoStorage.value.tabs.filter(t => t.id === currentActiveTabId.value)
    if (tabs.length > 0)
      return tabs[0]
  }
  return null
})

const tabLanguage = computed(() => {
  if (!currentActiveTab.value)
    return ''
  return currentActiveTab.value.language
})

const languageOptions = ref<Language[]>([
  { label: 'English', code: 'en' },
  { label: 'Deutsch', code: 'de' },
  { label: 'Português', code: 'pt' },
  { label: 'Italiano', code: 'it' },
  { label: 'Français', code: 'fr' },
  { label: 'Español', code: 'es' },
])
const isActivatingOnPage = ref<boolean>(false)
const activationSuccess = ref<boolean>(true)
const isTabEnabled = computed(async () => {
  return !currentActiveTab.value
})

const activateTranslations = async () => {
  await sendMessage('popup.activate', { sync: false }, 'background')
  isActivatingOnPage.value = true
  activationSuccess.value = false
}

// onMessage('popup.setActiveTabId', async ({ data }) => {
//   console.log('should fire on mounted each time popup.setActiveTabId', data)
// })

// onMessage('popup.activeTabs', async ({ data }) => {
// })

// onMessage('popup.activate.finished', async ({ data }) => {
//   isActivatingOnPage.value = false
//   activationSuccess.value = true
// })

onMounted(async () => {
  currentActiveTabId.value = await getCurrentBrowserTabId()
})
</script>

<template>
  <main class="w-300px px-4 py-5 text-center text-gray-700">
    <h3 class="py-2">
      Your Language
    </h3>
    <select
      v-model="userStorage.language"
      class="w-full mb-4 p-2 bg-green-300 text-gray-600 rounded"
    >
      <option v-for="lang in languageOptions" :key="lang.code" :value="lang.code">
        {{ lang.label }}
      </option>
    </select>
    <h3 class="py-2">
      Content Language
    </h3>
    <select
      v-model="tabLanguage"
      class="w-full mb-4 p-2 bg-green-300 text-gray-600 rounded"
    >
      <option v-for="lang in languageOptions" :key="lang.code" :value="lang.code">
        {{ lang.label }}
      </option>
    </select>
    <div class="px-3 py-2 flex items-center justify-between">
      <div class="flex items center space-x-2">
        <p>Say Words</p>
      </div>
      <Toggle
        :model-value="extensionSettingsStorage.isSpeakWords"
        @update:model-value="extensionSettingsStorage.isSpeakWords = $event"
      />
    </div>
    <div class="px-3 py-2 flex items-center justify-between">
      <div class="flex items center space-x-2">
        <p>Say Sentences</p>
      </div>
      <Toggle
        :model-value="extensionSettingsStorage.isSpeakSentences"
        @update:model-value="extensionSettingsStorage.isSpeakSentences = $event"
      />
    </div>
    <div class="px-3 py-2 flex items-center justify-between">
      <div class="flex items center space-x-2">
        <p>Start Extension in all new Tabs</p>
      </div>
      <Toggle
        :model-value="extensionSettingsStorage.isExtensionActiveInAllTabs"
        @update:model-value=" extensionSettingsStorage.isExtensionActiveInAllTabs = $event"
      />
    </div>
    <button
      v-if="!isTabEnabled" class="
        mt-5
        font-bold
        py-2
        px-4
        rounded
        text-white
      "
      :class="{
        'bg-yellow-500 hover:bg-yellow-700': !isTabEnabled,
        'bg-green-500': isTabEnabled,
        'bg-green-700': isActivatingOnPage,
      }"
      :disabled="isTabEnabled" @click="activateTranslations()"
    >
      <span v-if="!isTabEnabled && !isActivatingOnPage">Activate on this Tab</span>
      <span v-if="isActivatingOnPage && !isTabEnabled">
        <icon-park-outline:loading class="animate-spin block m-auto text-white text-lg" />
      </span>
      <span v-if="activationSuccess && isTabEnabled">
        Done.
        <icon-park-outline:check class="block m-auto text-green text-lg" />
      </span>
      <span v-if="!activationSuccess && isTabEnabled">Error</span>
    </button>
    currentActiveTabId: {{ currentActiveTabId }}
    currentActiveTab:{{ currentActiveTab }}
    userStorage: {{ userStorage.language }}
  </main>
</template>
