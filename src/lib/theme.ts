export const THEME_STORAGE_KEY = 'koa-theme'
// Static, trusted script runs in the head before the page is painted.
export const themeInitScript = `(function(){var t;try{t=localStorage.getItem('koa-theme')}catch(e){}if(t!=='light'&&t!=='dark')t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t})()`
