<script setup lang="ts">
import { createApp, ref } from 'vue'
import $ from 'jquery'
import Mark from 'mark.js'
import 'virtual:windi.css'
import tokenizer from 'sbd'
import { onMessage } from 'webext-bridge'

import getLanguageDefaults from '../../logic/detectLanguage'
import { WordUnderCursor } from '../../logic/hover'
import Sentence from '~/components/Sentence.vue'

const isRedirecting = ref(false)
const isEnabled = ref(false)
const currentTabLanguage = ref('')
const userLanguage = ref('')
const extensionSharedStorage = ref()

const getFullSentence = (e: JQuery.TriggeredEvent) => {
  let str = ''
  let useParent = false
  if ($(e.target).is('a,i,b') && $(e.target).parent().is('p,h1,h2,h3,h4,h5,h6')) {
    str = $(e.target).parent().text()
    useParent = true
  }
  else {
    str = $(e.target).text()
  }
  const sentences = tokenizer.sentences(str, {
    newline_boundaries: false,
    html_boundaries: false,
    sanitize: false,
    allowed_tags: false,
    preserve_whitespace: true,
    // abbreviations: '',
  })
  const target = useParent ? $(e.target).parent()[0] : $(e.target)[0]
  const instance = new Mark(target)
  sentences.forEach((s) => {
    const searchSentence = s.replace(/\n/gi, '').replace(/\s+/g, ' ').trim()
    instance.mark(searchSentence, {
      acrossElements: true,
      separateWordSearch: false,
      element: 'learnsentence',
      exclude: [
        'style *',
        'script *',
        'learnsentence',
        'wordwrap',
        '.learnword',
        '.translatetools',
      ],
      className: 'sentenceHighlight',
    })
  })
  if (!e.clientX || !e.clientY)
    return {}
  const clicked = document.elementFromPoint(e.clientX, e.clientY)
  if (clicked && $(clicked).is('learnsentence')) {
    $(clicked).addClass('thesentence')
    instance.unmark({ exclude: ['.thesentence'] })
    return { clicked, x: e.clientX, y: e.clientY }
  }
  return {}
}

const enableContentClickProxy = () => {
  $(document.body).addClass('languageextensioncss')
  $(document.body).on('click', (e: JQuery.TriggeredEvent) => {
    if (isRedirecting.value)
      return
    if (
      $(e.target).is('body, wordwrap, .learnword, .translatetools')
      || !!$(e.target).closest('wordwrap, .learnword, .translatetools').length
    ) {
      console.log('ignore click....')
      return
    }
    if (!$(e.target).closest('body')[0])
      return // removed from DOM

    const { word } = WordUnderCursor.getFullWord(e)
    if (!word)
      return

    const isWrappedSentence = !!$(e.target).closest('sentencewrap').length
    if (!isWrappedSentence) {
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()
      const { clicked, x, y } = getFullSentence(e)
      if (!clicked || !x || !y)
        return
      // store text
      const sentenceText = $(clicked).text()
      // empty node
      $(clicked).empty()

      if (sentenceText !== '' && !!Sentence) {
        // create a new vue app for each sentence
        createApp(
          {
            extends: Sentence,
            setup(props, context) {
              // necessary otherwise won't run
              if (!Sentence?.setup)
                return
              return {
                ...Sentence.setup({
                  sentence: sentenceText,
                  x,
                  y,
                  currentTabLanguage: currentTabLanguage.value,
                  userLanguage: userLanguage.value,
                  speakWords: false,
                  speakSentences: false,
                }, context),
              }
            },
          },
        ).mount(clicked)
      }
    }
  })
}

watch(isEnabled, (newVal, prevVal) => {
  if (newVal)
    enableContentClickProxy()
  if (prevVal === true && newVal === false)
    window.location.reload()
})

onMessage('content.storage', async ({ data }) => {
  extensionSharedStorage.value = data
  userLanguage.value = extensionSharedStorage.value.userStorage.language
})

onMessage('content.getCurrentActiveTabLanguage', async () => {
  return currentTabLanguage.value
})

onMessage('content.isEnabled', async ({ data }) => {
  isEnabled.value = data.isEnabled
})

onMounted(async () => {
  try {
    const { currentTabLanguage: language } = await getLanguageDefaults()
    if (language)
      currentTabLanguage.value = language
  }
  catch (e: any) {
    console.error('Error loading language extension:', e)
  }
})
</script>

<template>
  <div />

  <!-- debugging reactive -->
  <!-- <div style="z-index:1000000" class=" w-{200px} h-{200px}4 bg-green-500 top-0 left-0 absolute">
    extensionSharedStorage:{{ extensionSharedStorage }}
  </div> -->
</template>

<style src="../../styles/fonts.css" />

<style src="../../styles/content.css" />
