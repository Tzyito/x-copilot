import type { DomSelectionRecord } from '@/types'
import { ContentStorage } from './storage'

export class DomSelector {
  private isActive = false
  private hoveredElement: HTMLElement | null = null
  private overlay: HTMLDivElement | null = null
  private instructionPanel: HTMLDivElement | null = null
  private successNotification: HTMLDivElement | null = null
  private onSelectionCallback?: (record: DomSelectionRecord) => void
  
  constructor() {
    this.createOverlay()
    this.createInstructionPanel()
    this.createSuccessNotification()
    this.bindEvents()
  }
  
  activate(): void {
    if (this.isActive) return
    
    this.isActive = true
    document.body.style.cursor = 'crosshair'
    document.body.style.userSelect = 'none'
    this.showInstructions()
  }
  
  deactivate(): void {
    if (!this.isActive) return
    
    this.isActive = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    this.hideHighlight()
    this.hideInstructions()
  }
  
  onSelection(callback: (record: DomSelectionRecord) => void): void {
    this.onSelectionCallback = callback
  }
  
  private bindEvents(): void {
    document.addEventListener('mouseover', this.handleMouseOver.bind(this), true)
    document.addEventListener('click', this.handleClick.bind(this), true)
    document.addEventListener('keydown', this.handleKeyDown.bind(this), true)
  }
  
  private handleMouseOver(e: MouseEvent): void {
    if (!this.isActive) return
    
    const target = e.target as HTMLElement
    if (this.isValidTarget(target)) {
      this.highlightElement(target)
    } else {
      this.hideHighlight()
    }
  }
  
  private handleClick(e: MouseEvent): void {
    if (!this.isActive) return
    
    e.preventDefault()
    e.stopPropagation()
    
    const target = e.target as HTMLElement
    if (this.isValidTarget(target)) {
      const record = this.selectElement(target)
      if (this.onSelectionCallback) {
        this.onSelectionCallback(record)
        this.showSuccessNotification(record.content)
      }
    }
  }
  
  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.isActive) return
    
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      this.deactivate()
    }
  }
  
  private isValidTarget(element: HTMLElement): boolean {
    // 排除无意义的元素
    const excludeTags = ['HTML', 'BODY', 'SCRIPT', 'STYLE', 'META', 'LINK', 'TITLE']
    const excludeClasses = ['dom-selector-overlay', 'dom-selector-instruction', 'dom-selector-success']
    
    if (excludeTags.includes(element.tagName)) {
      return false
    }
    
    // 检查是否是我们创建的辅助元素
    if (excludeClasses.some(cls => element.classList.contains(cls))) {
      return false
    }
    
    // 检查元素是否有可见文本内容
    const text = element.textContent?.trim()
    if (!text || text.length < 3) {
      return false
    }
    
    // 检查元素是否可见
    const style = window.getComputedStyle(element)
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false
    }
    
    return true
  }
  
  private highlightElement(element: HTMLElement): void {
    this.hoveredElement = element
    const rect = element.getBoundingClientRect()
    
    if (this.overlay && rect.width > 0 && rect.height > 0) {
      this.overlay.style.display = 'block'
      this.overlay.style.left = (rect.left + window.scrollX) + 'px'
      this.overlay.style.top = (rect.top + window.scrollY) + 'px'
      this.overlay.style.width = rect.width + 'px'
      this.overlay.style.height = rect.height + 'px'
      
      // 添加文本预览提示
      const previewText = this.extractTextContent(element).substring(0, 50) + (element.textContent?.length! > 50 ? '...' : '')
      this.overlay.setAttribute('data-preview', previewText)
    }
  }
  
  private hideHighlight(): void {
    if (this.overlay) {
      this.overlay.style.display = 'none'
    }
  }
  
  private selectElement(element: HTMLElement): DomSelectionRecord {
    const content = this.extractTextContent(element)
    const selector = this.generateSelector(element)
    
    const record: DomSelectionRecord = {
      id: ContentStorage.generateId(),
      source: 'your-lightning',
      content,
      timestamp: Date.now(),
      url: window.location.href,
      site: {
        name: window.location.hostname,
        favicon: this.getFavicon()
      },
      selector,
      elementTag: element.tagName.toLowerCase(),
      preview: content.length > 100 ? content.substring(0, 100) + '...' : content
    }
    
    this.deactivate()
    return record
  }
  
  private extractTextContent(element: HTMLElement): string {
    // 获取元素的纯文本内容，去除多余空白
    let text = element.textContent || ''
    
    // 清理文本
    text = text
      .replace(/\s+/g, ' ')  // 多个空白字符替换为单个空格
      .replace(/\n\s*/g, '\n')  // 保留换行但去掉换行后的空格
      .trim()
    
    return text
  }
  
  private generateSelector(element: HTMLElement): string {
    const path: string[] = []
    let current = element
    
    while (current && current !== document.body && path.length < 5) {
      let selector = current.tagName.toLowerCase()
      
      // 优先使用 ID
      if (current.id) {
        selector += '#' + CSS.escape(current.id)
        path.unshift(selector)
        break
      }
      
      // 使用有意义的 class
      if (current.className && typeof current.className === 'string') {
        const classes = current.className
          .split(' ')
          .filter(cls => cls && !cls.match(/^[a-z0-9-_]{8,}$/i)) // 过滤掉看起来像随机生成的类名
          .slice(0, 2) // 最多取 2 个类名
          .map(cls => CSS.escape(cls))
        
        if (classes.length > 0) {
          selector += '.' + classes.join('.')
        }
      }
      
      // 如果有兄弟元素，添加 nth-child
      const siblings = Array.from(current.parentNode?.children || [])
        .filter(el => el.tagName === current.tagName)
      
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1
        selector += `:nth-of-type(${index})`
      }
      
      path.unshift(selector)
      current = current.parentElement!
    }
    
    return path.join(' > ')
  }
  
  private getFavicon(): string {
    const link = document.querySelector<HTMLLinkElement>('link[rel*="icon"]')
    if (link?.href) {
      return link.href
    }
    return `${window.location.origin}/favicon.ico`
  }
  
  private createOverlay(): void {
    this.overlay = document.createElement('div')
    this.overlay.className = 'dom-selector-overlay'
    this.overlay.style.cssText = `
      position: absolute;
      pointer-events: none;
      border: 2px solid #3b82f6;
      background: rgba(59, 130, 246, 0.1);
      z-index: 999999;
      display: none;
      border-radius: 4px;
      transition: all 0.1s ease;
    `
    
    // 添加悬浮提示样式
    const style = document.createElement('style')
    style.textContent = `
      .dom-selector-overlay::before {
        content: attr(data-preview);
        position: absolute;
        bottom: calc(100% + 5px);
        left: 0;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        max-width: 300px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        pointer-events: none;
      }
    `
    document.head.appendChild(style)
    document.body.appendChild(this.overlay)
  }
  
  private createInstructionPanel(): void {
    this.instructionPanel = document.createElement('div')
    this.instructionPanel.className = 'dom-selector-instruction'
    this.instructionPanel.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      z-index: 1000000;
      display: none;
      backdrop-filter: blur(4px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `
    this.instructionPanel.innerHTML = `
      <div style="display: flex; align-items: center;">
        <div style="font-size: 20px; margin-right: 10px;">🎯</div>
        <div>
          <div style="font-weight: 500; margin-bottom: 2px;">选择页面元素保存内容</div>
          <div style="font-size: 12px; opacity: 0.8;">
            点击选择 • 悬停预览 • 按 ESC 退出
          </div>
        </div>
      </div>
    `
    document.body.appendChild(this.instructionPanel)
  }

  private createSuccessNotification(): void {
    this.successNotification = document.createElement('div')
    this.successNotification.className = 'dom-selector-success'
    this.successNotification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      z-index: 1000000;
      display: none;
      backdrop-filter: blur(4px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      animation: fadeInOut 3s forwards;
      max-width: 400px;
    `
    
    const style = document.createElement('style')
    style.textContent = `
      @keyframes fadeInOut {
        0% { opacity: 0; transform: translateY(20px); }
        10% { opacity: 1; transform: translateY(0); }
        90% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-20px); }
      }
    `
    document.head.appendChild(style)
    document.body.appendChild(this.successNotification)
  }
  
  private showInstructions(): void {
    if (this.instructionPanel) {
      this.instructionPanel.style.display = 'block'
    }
  }
  
  private hideInstructions(): void {
    if (this.instructionPanel) {
      this.instructionPanel.style.display = 'none'
    }
  }
  
  private showSuccessNotification(content: string): void {
    if (this.successNotification) {
      const preview = content.length > 70 ? content.substring(0, 70) + '...' : content
      this.successNotification.innerHTML = `
        <div style="display: flex; align-items: center;">
          <div style="font-size: 20px; margin-right: 10px;">✅</div>
          <div>
            <div style="font-weight: 500; margin-bottom: 2px;">内容已保存</div>
            <div style="font-size: 12px; opacity: 0.9; word-break: break-word;">"${preview}"</div>
          </div>
        </div>
      `
      this.successNotification.style.display = 'block'
      
      // 3 秒后自动隐藏
      setTimeout(() => {
        if (this.successNotification) {
          this.successNotification.style.display = 'none'
        }
      }, 3000)
    }
  }
  
  destroy(): void {
    this.deactivate()
    
    if (this.overlay) {
      this.overlay.remove()
      this.overlay = null
    }
    
    if (this.instructionPanel) {
      this.instructionPanel.remove()
      this.instructionPanel = null
    }
    
    if (this.successNotification) {
      this.successNotification.remove()
      this.successNotification = null
    }
    
    document.removeEventListener('mouseover', this.handleMouseOver.bind(this), true)
    document.removeEventListener('click', this.handleClick.bind(this), true)
    document.removeEventListener('keydown', this.handleKeyDown.bind(this), true)
  }
}