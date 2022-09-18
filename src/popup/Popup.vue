<script setup lang="ts">
import { onMessage, sendMessage } from 'webext-bridge'
import type tabData from '../types/tabData'
import type Language from '../types/Language'
import { getBrowserLanguage } from '../logic/detectLanguage'
import { storageDemo } from '~/logic/storage'

interface ExtensionSettings {
  speakWords: boolean
  speakSentences: boolean
  isExtensionActiveInAllTabs: boolean
}

const currentTabLanguage = ref<string>()
const languageOptions = ref<Language[]>([
  { label: 'English', code: 'en' },
  { label: 'Deutsch', code: 'de' },
  { label: 'Português', code: 'pt' },
  { label: 'Italiano', code: 'it' },
  { label: 'Français', code: 'fr' },
  { label: 'Español', code: 'es' },
])
const userLanguage = ref<string>('')
const isActivatingOnPage = ref<boolean>(false)
const activationSuccess = ref<boolean>(true)
const extensionSettings = ref<ExtensionSettings>({
  speakWords: false,
  speakSentences: false,
  isExtensionActiveInAllTabs: false,
})
const currentActiveTab = ref<tabData>()
const activeTabId = ref<number>()
const isEnabled = computed(() => !!(currentActiveTab.value?.id === activeTabId.value && currentTabLanguage.value && userLanguage.value))

const updateExtensionSettings = async () => {
  await sendMessage('bg.extensionSettings', {
    data: {
      extensionSettings: extensionSettings.value,
    },
  }, 'background')
}

const activateTranslations = async () => {
  await sendMessage('popup.activate', { sync: false }, 'background')
  isActivatingOnPage.value = true
  activationSuccess.value = false
}

const refreshExtensionData = (data) => {
  if (data.activeTabId < 0)
    throw new Error('Active Tab not identified')

  if (data.extensionSettings)
    extensionSettings.value = data.extensionSettings
}

onMessage('popup.activeTabs', async ({ data }) => {
  refreshExtensionData(data)
  currentActiveTab.value = data.currentActiveTab
  activeTabId.value = data.activeTabId
  currentTabLanguage.value = data.currentActiveTab.currentTabLanguage
})

onMessage('popup.activate.finished', async ({ data }) => {
  refreshExtensionData(data)
  currentTabLanguage.value = data.currentActiveTab.currentTabLanguage
  activeTabId.value = data.activeTabId
  currentActiveTab.value = data.currentActiveTab
  isActivatingOnPage.value = false
  activationSuccess.value = true
})

watch([currentTabLanguage, userLanguage], async (newValues, prevValues) => {
  // if (isEnabled.value) {
  await sendMessage('bg.tabSettings', {
    data: {
      currentTabLanguage: newValues[0],
      userLanguage: newValues[1] || '',
    },
  }, 'background')
  isActivatingOnPage.value = false
  activationSuccess.value = true
  // }
})

onMounted(async () => {
  await sendMessage('bg.activeTabs', { data: { } }, 'background')

  if (!userLanguage.value) {
    const detectedUserLanguage = getBrowserLanguage()
    userLanguage.value = detectedUserLanguage || ''
  }
})
</script>

<template>
  <main class="w-300px px-4 py-5 text-center text-gray-700">
    <h3 class="py-2">
      Your Language
    </h3>
    <select v-model="userLanguage" class="w-full mb-4 p-2 bg-green-300 text-gray-600 rounded">
      <option v-for="lang in languageOptions" :key="lang.code" :value="lang.code">
        {{ lang.label }}
      </option>
    </select>
    <h3 class="py-2">
      Content Language
    </h3>
    <select v-model="currentTabLanguage" class="w-full mb-4 p-2 bg-green-300 text-gray-600 rounded">
      <option v-for="lang in languageOptions" :key="lang.code" :value="lang.code">
        {{ lang.label }}
      </option>
    </select>
    <div class="px-3 py-2 flex items-center justify-between">
      <div class="flex items center space-x-2">
        <p>Say Words</p>
      </div>
      <Toggle
        :model-value="extensionSettings.speakWords" @update:model-value="extensionSettings.speakWords = $event"
        @change="updateExtensionSettings()"
      />
    </div>
    <div class="px-3 py-2 flex items-center justify-between">
      <div class="flex items center space-x-2">
        <p>Say Sentences</p>
      </div>
      <Toggle
        :model-value="extensionSettings.speakSentences"
        @update:model-value="extensionSettings.speakSentences = $event" @change="updateExtensionSettings()"
      />
    </div>
    <div class="px-3 py-2 flex items-center justify-between">
      <div class="flex items center space-x-2">
        <p>Start Extension in all new Tabs</p>
      </div>
      <Toggle
        :model-value="extensionSettings.isExtensionActiveInAllTabs"
        @update:model-value=" extensionSettings.isExtensionActiveInAllTabs = $event"
        @change="updateExtensionSettings()"
      />
    </div>
    <button
      v-if="!isEnabled" class="
        mt-5
        font-bold
        py-2
        px-4
        rounded
        text-white
      "
      :class="{ 'bg-yellow-500 hover:bg-yellow-700': !isEnabled, 'bg-green-500': isEnabled, 'bg-green-700': isActivatingOnPage }"
      :disabled="isEnabled" @click="activateTranslations()"
    >
      <span v-if="!isEnabled && !isActivatingOnPage">Activate on this Tab</span>
      <span v-if="isActivatingOnPage && !isEnabled">
        <icon-park-outline:loading class="animate-spin block m-auto text-white text-lg" />
      </span>
      <span v-if="activationSuccess && isEnabled">
        Done.
        <icon-park-outline:check class="block m-auto text-green text-lg" />
      </span>
      <span v-if="!activationSuccess && isEnabled">Error</span>
    </button>
  </main>
</template>
