import type { Tabs } from 'webextension-polyfill'
import browser from 'webextension-polyfill'
import { onMessage, sendMessage } from 'webext-bridge'
import type tabData from '../types/tabData'

if (__DEV__)
  import('./contentScriptHMR')

browser.runtime.onInstalled.addListener((): void => {
  // eslint-disable-next-line no-console
  console.log('Extension installed')
})

let previousTabId = 0

// communication example: send previous tab title from background page
// see shim.d.ts for type declaration
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

const sendMessageToActiveTab = async (message: any): Promise<void> => {
  browser.tabs
    .query({ currentWindow: true, active: true })
    .then(([tab]) => {
      if (tab && tab.id)
        browser.tabs.sendMessage(tab.id, message)
    })
    .catch(e => console.warn('message error', e))
}

function getCurrentActiveTab(): tabData | null {
  if (activeTabId === -1 || !activeTabs.length)
    return null
  return activeTabs.find(t => t.id === activeTabId) || null
}

browser.runtime.onMessage.addListener(async (request) => {
  console.log('background received request', request)

  if (activeTabId < 0)
    throw new Error('currentActiveTab undefined, cannot continue.')

  if (request.action === 'popup.activate') {
    console.log('bg popup.activate start')
    await injectExtensionInTab()
    console.log('bg popup.activate end')
  }
  else if (request.action === 'bg.extensionSettings') {
    extensionSettings = request.extensionSettings
    await sendMessageToActiveTab({
      action: 'content.settings',
      activeTabId,
      currentActiveTab: getCurrentActiveTab(),
      extensionSettings,
    })
  }
  else if (request.action === 'bg.tabSettings') {
    updateOpenTabsData(request)
    await sendMessageToActiveTab({
      action: 'content.settings',
      activeTabId,
      currentActiveTab: getCurrentActiveTab(),
      extensionSettings,
    })
  }
  else if (request.action === 'bg.tab.ready') {
    updateOpenTabsData(request)
    await browser.runtime.sendMessage({
      action: 'popup.activate.finished',
      activeTabId,
      currentActiveTab: getCurrentActiveTab(),
      extensionSettings,
    })
  }
  else if (request.action === 'bg.activeTabs') {
    await browser.runtime.sendMessage({
      action: 'popup.activeTabs',
      currentActiveTab: getCurrentActiveTab(),
      activeTabId,
      extensionSettings,
    })
  }
})

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

// browser.runtime.onInstalled.addListener((): void => {
//   // eslint-disable-next-line no-console
//   console.log('Extension installed')
// })

onMessage('popup.activate', async () => {
  await injectExtensionInTab()
})
