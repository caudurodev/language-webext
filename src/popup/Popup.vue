<script setup lang="ts">
import { sendMessage } from 'webext-bridge'
import type Language from '../types/Language'
import { extensionSettingsStorage, tabsInfoStorage, userStorage } from '~/logic/storage'

const tabLanguage = ref('')
const isCurrentTabEnabled = ref(false)
const currentTabId = ref<number>()

const languageOptions = ref<Language[]>([
  { label: 'English', code: 'en' },
  { label: 'Deutsch', code: 'de' },
  { label: 'Português', code: 'pt' },
  { label: 'Italiano', code: 'it' },
  { label: 'Français', code: 'fr' },
  { label: 'Español', code: 'es' },
])

const findActiveTab = () => {
  const activeTab = tabsInfoStorage.value.find(t => t.id === currentTabId.value)
  if (activeTab)
    return activeTab
  return null
}

const storeActiveTab = () => {
  if (!currentTabId.value)
    return

  if (findActiveTab())
    tabsInfoStorage.value = tabsInfoStorage.value.filter(t => t.id !== currentTabId.value)
  tabsInfoStorage.value.push({
    id: currentTabId.value,
    isEnabled: isCurrentTabEnabled.value,
  })
}
watch(isCurrentTabEnabled, async (newVal) => {
  console.log('isCurrentTabEnabled', newVal)
  storeActiveTab()
  const activeTab = findActiveTab()
  console.log('activeTab', activeTab)
  console.log('isCurrentTabEnabled.value', isCurrentTabEnabled.value)
  console.log('tabsInfoStorage.value', tabsInfoStorage.value)
  await sendMessage('bg.isCurrentTabEnabled', { isEnabled: newVal }, 'background')
})

watch([extensionSettingsStorage, userStorage], async () => {
  await sendMessage('bg.storage', {
    extensionSettingsStorage: extensionSettingsStorage.value,
    userStorage: userStorage.value,
  }, 'background')
}, { deep: true })

onMounted(async () => {
  console.log('tabsInfoStorage.value.tabs on mounted', tabsInfoStorage.value)
  currentTabId.value = await sendMessage('bg.getCurrentActiveTabId', {}, 'background')
  console.log('currentTabId.value', currentTabId.value)
  storeActiveTab()
  await sendMessage('bg.storage', {
    extensionSettingsStorage: extensionSettingsStorage.value,
    userStorage: userStorage.value,
  }, 'background')
  // check if enabled from storage
  const activeTab = findActiveTab()
  console.log('activeTab is', activeTab?.isEnabled)
  if (activeTab)
    isCurrentTabEnabled.value = activeTab.isEnabled
  console.log('isCurrentTabEnabled.value', isCurrentTabEnabled.value)
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
        @update:model-value="extensionSettingsStorage.isExtensionActiveInAllTabs = $event"
      />
    </div>
    <div class="px-3 py-2 flex items-center justify-between">
      <div class="flex items center space-x-2">
        <p>Active in current tab</p>
      </div>
      <Toggle
        :model-value="isCurrentTabEnabled"
        @update:model-value="isCurrentTabEnabled = $event"
      />
    </div>
    <div py-4 mb-4 block bg-green-400>
      aaaextensionSettingsStorage: {{ extensionSettingsStorage }}
    </div>
    <br><br>
    <div py-4>
      isCurrentTabEnabled: {{ isCurrentTabEnabled }}
    </div>
  </main>
</template>
