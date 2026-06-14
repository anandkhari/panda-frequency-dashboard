export const THEME_STORAGE_KEY = 'theme'

export function getThemeInitScript() {
  return `(function(){var key='${THEME_STORAGE_KEY}',theme='light';try{theme=localStorage.getItem(key)||''}catch(e){}if(theme!=='light'&&theme!=='dark'){try{theme=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch(e){theme='light'}}try{localStorage.setItem(key,theme)}catch(e){}document.documentElement.setAttribute('data-theme',theme);document.documentElement.style.colorScheme=theme})()`
}
