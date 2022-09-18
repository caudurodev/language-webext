import type { Tabs } from 'webextension-polyfill'
import browser from 'webextension-polyfill'
import { onMessage, sendMessage } from 'webext-bridge'
import type tabData from '../types/tabData'

if (__DEV__)
  import('./contentScriptHMR')

let previousTabId = 0

browser.tabs.onActivated.addListener(async ({ tabId }) => {
  if (!previousTabId) {
    previousTabId = tabId
    return
  }
  let tab: Tabs.Tab
  try {
    tab = await browser.tabs.get(previousTabId)
    previousTabId = tabId
  }
  catch {
    return
  }
  // eslint-disable-next-line no-console
  console.log('previous tab', tab)
  sendMessage('tab-prev', { title: tab.title }, { context: 'content-script', tabId })
})

let activeTabId = -1
let activeTabs: tabData[] = []

interface ExtensionSettings {
  speakWords: boolean
  speakSentences: boolean
  isExtensionActiveInAllTabs: boolean
}

let extensionSettings: ExtensionSettings = {
  speakWords: false,
  speakSentences: false,
  isExtensionActiveInAllTabs: false,
}

async function injectExtensionInTab(): Promise<void> {
  console.log('injectExtensionInTab')
  if (!activeTabs.find(t => t.id === activeTabId)) {
    // change browser button badge test
    // browser.browserAction.setBadgeBackgroundColor({ color: [213, 63, 140, 230] })
    // browser.browserAction.setBadgeText({ text: '1' })
    console.log('new active tab')

    try {
      await browser.scripting.executeScript({
        target: { tabId: activeTabId },
        files: ['/dist/contentScripts/index.global.js'],
      })
    }
    catch (err) {
      console.error(`failed to execute script: ${err}`)
    }

    try {
      await browser.scripting.insertCSS({
        target: { tabId: activeTabId },
        files: ['/dist/contentScripts/style.css'],
      })
    }
    catch (e) {
      console.log('insertCSS error', e)
    }

    console.log('new active tab')
  }
  else {
    console.log('already active tab id', activeTabs, activeTabId)
    // await sendMessageToActiveTab({ action: 'toggle.sidebar' })
  }
  console.log('activeTabs', activeTabs)
}

function isCurrentTabActivated(): boolean {
  return !!activeTabs.find(t => t.id === activeTabId)
}

function updateOpenTabsData(request: any): tabData[] {
  if (activeTabId === -1)
    return activeTabs
  if (isCurrentTabActivated()) {
    // update
    activeTabs = activeTabs.map((t: tabData) => {
      if (t.id === activeTabId)
        return { ...t, currentTabLanguage: request?.currentTabLanguage, userLanguage: request?.userLanguage }
      return t
    })
  }
  else {
    // create
    activeTabs.push({
      id: activeTabId,
      currentTabLanguage: request?.currentTabLanguage || '',
      userLanguage: request?.userLanguage || '',
    })
  }
  return activeTabs
}

function getCurrentActiveTab(): tabData | null {
  if (activeTabId === -1 || !activeTabs.length)
    return null
  return activeTabs.find(t => t.id === activeTabId) || null
}

// --- On Reloading, remove tabs from active ---
browser.webNavigation.onCommitted.addListener((details) => {
  activeTabs = activeTabs.filter(t => t.id !== details.tabId)
  if (extensionSettings.isExtensionActiveInAllTabs)
    injectExtensionInTab()
})

// detect currently active tab
browser.tabs.onActivated.addListener((tabId) => {
  browser.tabs.get(tabId.tabId)
    .then((tab) => {
      if (tab.id) {
        activeTabId = tab.id
        if (extensionSettings.isExtensionActiveInAllTabs)
          injectExtensionInTab()
      }
    })
})

onMessage('popup.activate', async () => {
  await injectExtensionInTab()
})

onMessage('get-current-tab', async () => {
  try {
    const tab = await browser.tabs.get(previousTabId)
    return {
      title: tab?.title,
    }
  }
  catch {
    return {
      title: undefined,
    }
  }
})

onMessage('bg.activeTabs', async () => {
  const currentActiveTab = await getCurrentActiveTab()
  if (!currentActiveTab)
    return
  await sendMessage('popup.activeTabs', {
    data: {
      currentActiveTab,
      activeTabId,
      extensionSettings,
    },
  }, `popup@${activeTabId}`)
})

onMessage('bg.extensionSettings', async ({ data }) => {
  console.log('bg.extensionSettings', data)
  extensionSettings = data.extensionSettings
  const currentActiveTab = await getCurrentActiveTab()
  if (!currentActiveTab)
    return
  await sendMessage('content.settings', {
    data: {
      currentActiveTab,
      activeTabId,
      extensionSettings,
    },
  },
  `content-script@${activeTabId}`)
})

onMessage('bg.tabSettings', async ({ data }) => {
  console.log('bg.tabSettings', data)
  const currentActiveTab = await getCurrentActiveTab()
  if (!currentActiveTab)
    return
  updateOpenTabsData(data)
  await sendMessage('content.settings', {
    data: {
      currentActiveTab,
      activeTabId,
      extensionSettings,
    },
  },
  `content-script@${activeTabId}`)
})

onMessage('bg.tab.ready', async ({ data }) => {
  const currentActiveTab = await getCurrentActiveTab()
  if (!currentActiveTab)
    return
  updateOpenTabsData(data)
  await sendMessage('popup.activate.finished', {
    data: {
      currentActiveTab,
      activeTabId,
      extensionSettings,
    },
  },
  `popup@${activeTabId}`)
})

