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
const userLanguage = ref<string>('')
const extensionSharedStorage = ref()

const getFullSentence = (e: JQuery.TriggeredEvent) => {
  let str = ''
  let useParent = false
  if ($(e.target).is('a,i,b') && $(e.target).parent().is('p,h1,h2,h3')) {
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

const trackContentClicks = () => {
  $(document.body).on('click', (e: JQuery.TriggeredEvent) => {
    if (!isEnabled.value) {
      console.log('stop click as disabled')
      return
    }
    else {
      console.log('allow click as enabled')
    }
    if (isRedirecting.value)
      return
    if (
      $(e.target).is('body, wordwrap, .learnword, .translatetools')
      || !!$(e.target).closest('wordwrap, .learnword, .translatetools').length
    ) {
      console.log('ignore click....')
      return
    }

    const { word } = WordUnderCursor.getFullWord(e)
    if (!word)
      return

    if (!$(e.target).closest('body')[0])
      return // removed from DOM

    const isWrappedSentence = !!$(e.target).closest('sentencewrap').length // sentence already wrapped
    if (!isWrappedSentence) {
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()
      const { clicked, x, y } = getFullSentence(e)
      if (!clicked || !x || !y)
        return
      const sentenceText = ref<string>($(clicked).text())
      $(clicked).empty()

      if (sentenceText.value !== '' && !!Sentence) {
        createApp(
          {
            extends: Sentence,
            setup(props, context) {
              // necessary otherwise won't run
              if (!Sentence?.setup)
                return
              return {
                ...Sentence.setup({
                  sentence: sentenceText.value,
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

watch(isEnabled, (newVal) => {
  console.log('isEnabled:', newVal)
})

onMessage('content.storage', async ({ data }) => {
  console.log('received content.storage', data)
  // updates from popup
  extensionSharedStorage.value = data
})

onMessage('content.info', async () => {
  return { language: currentTabLanguage.value, isEnabled: isEnabled.value }
})

onMessage('content.isEnabled', async ({ data }) => {
  console.log('content.isEnabled', data)
  isEnabled.value = data.isEnabled
  if (!isEnabled.value) {
    // good place to reload
    //
  }
})

onMounted(async () => {
  try {
    const { currentTabLanguage: language } = await getLanguageDefaults()
    if (language)
      currentTabLanguage.value = language
    console.log('currentTabLanguage.value', currentTabLanguage.value)
    trackContentClicks()
    console.log('great success!')
  }
  catch (e: any) {
    console.error('error mount', e)
  }
})
</script>

<template>
  <div />
</template>

<style src="../../styles/fonts.css" />

<style src="../../styles/content.css" />
