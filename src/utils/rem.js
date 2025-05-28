// remConfig.js 核心实现
export default {
    scale: 0,
    install: function (win, doc) {
      const baseWidth = 1500
      const documentHTML = doc.documentElement
      const self = this
      
      function setRootFont() {
        const docWidth = documentHTML.getBoundingClientRect().width
        self.scale = docWidth / baseWidth
        documentHTML.style.setProperty('font-size', self.scale * 16 + 'px', 'important')
      }
      setRootFont() 
      win.addEventListener('resize', setRootFont, false)
    }
}
