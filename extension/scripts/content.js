(function() {
    'use strict'

    const CONFIG = Config
    function log(...args) {
        if (CONFIG.debug) console.log('[AutoCloseModal]', ...args)
    }
    function isVisible(el) {
        if (!el) return false
        const style = window.getComputedStyle(el)
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false
        const rect = el.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0
    }
    function findConfirmButton(modal) {
        const buttons = modal.querySelectorAll(CONFIG.confirmButtonSelector)
        for (const btn of buttons) {
            if (!isVisible(btn)) continue
            const text = (btn.textContent || '').trim().toLowerCase()
            if (CONFIG.confirmButtonText.some(t => text.includes(t.toLowerCase()))) {
                return btn
            }
        }
        return null
    }

    class ObserverManager {
        enabled = true
        observer = null
        callback = null

        constructor(cb) {
            this.callback = cb
            // 使用 MutationObserver 监听 DOM 变化，以便弹窗出现时能快速响应
            this.observer = new MutationObserver(cb)
        }

        pause() {
            log('暂停观察 DOM 变化...')
            this.observer.disconnect()
        }

        recovery() {
            if (this.enabled) {
                log('开始观察 DOM 变化...')
                this.observer.observe(document.body, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['style', 'class', 'hidden', 'aria-hidden']
                })
            }
        }

        stop() {
            this.enabled = false
            this.pause()
        }

        start() {
            this.enabled = true
            this.recovery()
            this.callback()
        }

        once() {
            this.callback()
        }
    }


    function checkBox(modal) {
        observer.pause()

        // 勾选所有可见且未选中的复选框
        const checkboxes = modal.querySelectorAll(CONFIG.checkboxSelector)
        let checkboxFound = false
        checkboxes.forEach(cb => {
            checkboxFound = true
            if (!cb.checked) {
                cb.click() // 模拟点击，自动触发 change/input 事件
                log('已勾选复选框:', cb)
            }
        })

        observer.recovery()

        if (!checkboxFound) {
            log('未找到可见复选框，等待重试...')
        }

        return checkboxFound
    }

    function buttonProcess(modal) {
        // 查找并点击确认按钮
        const confirmBtn = findConfirmButton(modal)
        if (!confirmBtn) {
            log('未找到确认按钮，等待重试...')
            return false
        }

        setTimeout(() => {
            processedModals.delete(modal)
            log('processedModals[After]: ', processedModals)
            confirmBtn.click()
            log('已点击确认按钮:', confirmBtn)
        }, CONFIG.confirmButtonDelay)

        return true
    }

    function processModal(modal) {
        return checkBox(modal) && buttonProcess(modal)
    }

    // 用于记录已经处理过且弹窗仍然可见的 modal，避免重复点击
    const processedModals = new WeakSet()

    function scanAndProcess() {
        const modals = document.querySelectorAll(CONFIG.modalSelector)
        for (const modal of modals) {
            if (processedModals.has(modal) || !isVisible(modal)) continue

            const success = processModal(modal)
            if (success) {
                processedModals.add(modal)
                log('processedModals[Before]: ', processedModals)
            }
        }
    }

    const observer = new ObserverManager(scanAndProcess)
    observer.start()

    // 定时扫描兜底
    // setInterval(scanAndProcess, CONFIG.interval)


    log('脚本已启动，请确认选择器配置正确。当前配置:', CONFIG)
})()