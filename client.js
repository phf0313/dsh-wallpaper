window.__ModuleLoader__.load({
  id: '@local/dsh-wallpaper',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /** This plugin's settings namespace: the Host entry id its form is bound to. */
    const NS = 'dsh-wallpaper'
    /** Route the Host half serves the picked picture on. */
    const PICTURE_ROUTE = '/dsh-wallpaper/media/picture'
    /** Route the Host half serves the desktop wallpaper bytes on. */
    const DESKTOP_ROUTE = '/dsh-wallpaper/media/desktop'
    /** Route reporting the desktop wallpaper's current identity. */
    const DESKTOP_INFO_ROUTE = '/dsh-wallpaper/media/desktop-info'
    /** Attribute marking the document whose background layer this plugin owns. */
    const LAYER_ATTRIBUTE = 'data-dsh-wallpaper-layer'
    /** Attribute present while the picture layer is painted, read by the stylesheet. */
    const ACTIVE_ATTRIBUTE = 'data-dsh-wallpaper-active'
    /** Picture pick limit; the Host serves at most this much too. */
    const MAX_PICTURE_BYTES = 64 * 1024 * 1024
    /** Picture extensions the Host half can serve. */
    const PICTURE_EXTENSIONS = /\.(png|jpe?g|webp|gif)$/i

    const en = {
      pageTitle: 'Wallpaper Background',
      title: 'Background',
      description: 'Show a picture or your computer desktop wallpaper behind the whole interface.',
      mode: 'Background source',
      modeNone: 'None',
      modePicture: 'Picture file',
      modeDesktop: 'Desktop wallpaper',
      opacity: 'Opacity',
      fit: 'Scaling',
      fitCover: 'Fill the window',
      fitContain: 'Fit the whole picture',
      veil: 'Overlay shade',
      veilNone: 'None',
      veilDark: 'Darken',
      veilLight: 'Lighten',
      picture: 'Picture',
      pick: 'Choose picture…',
      replace: 'Change picture…',
      clear: 'Remove picture',
      noPicture: 'No picture selected yet.',
      fileHint: 'PNG, JPEG, WebP, or GIF up to 64 MB.',
      checkInterval: 'Desktop check interval',
      pollHint: 'How often to look for a changed desktop wallpaper. 0 stops checking.',
      pollUnit: 'seconds',
      refresh: 'Check now',
      reset: 'Reset',
      currentDesktop: 'Current desktop wallpaper: {name}',
      desktopMissing: 'No desktop wallpaper can be read on this system.',
      desktopChecking: 'Reading the desktop wallpaper…',
      fileTooLarge: 'That picture is larger than 64 MB.',
      unsupported: 'Choose a PNG, JPEG, WebP, or GIF file.',
      readFailed: 'The picture could not be read; pick another file.',
      saveFailed: 'The deployment did not accept these values.',
      opening: 'Opening…',
      sheetNote: 'Close Settings to see the picture behind the interface.',
    }

    const zh = {
      pageTitle: '壁纸背景',
      title: '背景',
      description: '用图片或电脑当前的桌面壁纸作为整个界面的背景。',
      mode: '背景来源',
      modeNone: '关闭',
      modePicture: '本地图片',
      modeDesktop: '桌面壁纸',
      opacity: '透明度',
      fit: '缩放方式',
      fitCover: '填满窗口',
      fitContain: '完整显示',
      veil: '叠加色',
      veilNone: '无',
      veilDark: '压暗',
      veilLight: '提亮',
      picture: '图片',
      pick: '选择图片…',
      replace: '更换图片…',
      clear: '移除图片',
      noPicture: '尚未选择图片。',
      fileHint: '支持 PNG、JPEG、WebP、GIF，最大 64 MB。',
      checkInterval: '桌面壁纸检测间隔',
      pollHint: '多久检查一次桌面壁纸是否变化，0 表示不再自动检查。',
      pollUnit: '秒',
      refresh: '立即检查',
      reset: '恢复默认',
      currentDesktop: '当前桌面壁纸：{name}',
      desktopMissing: '当前系统没有可读取的桌面壁纸。',
      desktopChecking: '正在读取桌面壁纸…',
      fileTooLarge: '该图片超过 64 MB。',
      unsupported: '请选择 PNG、JPEG、WebP 或 GIF 图片。',
      readFailed: '无法读取该图片，请换一张。',
      saveFailed: '本部署没有接受这些设置。',
      opening: '正在打开…',
      sheetNote: '关闭设置后，背景会显示在整个界面后面。',
    }

    /**
     * 壁纸与遮罩位于 body 的伪元素层，应用内容仍在上方正常接收交互。
     * 主框架、中央列和侧栏使用两个主题底色变量；只有在壁纸实际可见时，
     * 才在 #root 内覆盖这两个变量，让壁纸透出来。输入框、气泡和菜单使用
     * 各自的表面变量，不需要全局清空背景或降低整个界面的不透明度。
     */
    const STYLE_ID = 'dsh-wallpaper-styles'
    const STYLES = `
body { --dwp-fit: cover; --dwp-opacity: 1; --dwp-veil: transparent; }
body[${LAYER_ATTRIBUTE}] #root { position: relative; z-index: 1; }
body[${ACTIVE_ATTRIBUTE}] #root {
  --dsw-alias-bg-base: transparent;
  --dsw-specific-sidebar-fill: transparent;
}
body[${ACTIVE_ATTRIBUTE}]::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image: var(--dwp-image, none);
  background-size: var(--dwp-fit, cover);
  background-position: center;
  background-repeat: no-repeat;
  opacity: var(--dwp-opacity, 1);
}
body[${ACTIVE_ATTRIBUTE}]::after {
  content: "";
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: var(--dwp-veil, transparent);
}
.dwp-shell { display: flex; flex-direction: column; width: 100%; }
.dwp-intro { display: flex; flex-direction: column; gap: 4px; padding: 16px 0; }
.dwp-row { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 16px 0; border-bottom: 0.5px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.3)); }
.dwp-row:last-child { border-bottom: none; }
.dwp-stack { display: flex; flex-direction: column; gap: 10px; padding: 16px 0; border-bottom: 0.5px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.3)); }
.dwp-stack:last-child { border-bottom: none; }
.dwp-stackActions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.dwp-text { display: flex; flex-direction: column; gap: 4px; min-width: 0; flex: 1; }
.dwp-title { color: var(--dsw-alias-label-primary); font-size: 14px; line-height: 22px; font-weight: 400; }
.dwp-hint { color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; overflow-wrap: anywhere; }
.dwp-control { flex: none; display: flex; align-items: center; gap: 10px; }
.dwp-select { height: 32px; padding: 0 10px; border-radius: 8px; border: 0.5px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.4)); background: var(--dsw-alias-bg-layer-2, transparent); color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; cursor: pointer; }
.dwp-select:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.dwp-slider { width: 156px; accent-color: var(--dsw-alias-brand-primary); }
.dwp-value { min-width: 42px; text-align: right; font-size: 13px; color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums; }
.dwp-button { height: 32px; padding: 0 14px; border-radius: 8px; border: 0.5px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.4)); background: var(--dsw-alias-interactive-bg-hover, transparent); color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; cursor: pointer; }
.dwp-button:hover:not(:disabled) { border-color: var(--dsw-alias-border-l1, rgba(128, 128, 128, 0.7)); }
.dwp-button:disabled { opacity: 0.55; cursor: default; }
.dwp-buttonPrimary { background: var(--dsw-alias-brand-primary); border-color: transparent; color: #ffffff; }
.dwp-file { color: var(--dsw-alias-label-primary); font-size: 13px; line-height: 20px; overflow-wrap: anywhere; }
.dwp-error { color: var(--dsw-alias-state-error-primary); font-size: 12px; line-height: 18px; padding-top: 4px; }
.dwp-meta { color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; }
.dwp-input { height: 32px; width: 88px; padding: 0 8px; border-radius: 8px; border: 0.5px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.4)); background: var(--dsw-alias-bg-layer-2, transparent); color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; }
.dwp-preview { position: relative; height: 132px; border-radius: 10px; overflow: hidden; border: 0.5px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.35)); background: var(--dsw-alias-bg-layer-2, rgba(128, 128, 128, 0.08)); }
.dwp-previewLayer { position: absolute; inset: 0; background-image: var(--dwp-image, none); background-size: var(--dwp-fit, cover); background-position: center; background-repeat: no-repeat; opacity: var(--dwp-opacity, 1); }
.dwp-previewVeil { position: absolute; inset: 0; background: var(--dwp-veil, transparent); }
.dwp-previewEmpty { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: var(--dsw-alias-label-secondary); font-size: 12px; }
`

    /** Insert the plugin stylesheet once; the returned disposer removes this copy. */
    function installStyles() {
      if (typeof document === 'undefined') return () => {}
      const selector = `style[data-plugin-css=${JSON.stringify(STYLE_ID)}]`
      if (document.querySelector(selector) !== null) return () => {}
      const tag = document.createElement('style')
      tag.dataset.plugin = '@local/dsh-wallpaper'
      tag.dataset.pluginCss = STYLE_ID
      tag.textContent = STYLES
      document.head.appendChild(tag)
      return () => {
        tag.remove()
      }
    }

    /** Pick one accepted value, or the fallback when it is not accepted. */
    function pickOne(value, allowed, fallback) {
      return allowed.includes(value) ? value : fallback
    }

    /** Clamp one numeric setting into its accepted range. */
    function clampNumber(value, min, max, fallback) {
      const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
      if (!Number.isFinite(parsed)) return fallback
      return Math.min(max, Math.max(min, Math.trunc(parsed)))
    }

    /** Whether the settings document holds a picked picture. */
    function hasPictureBytes(value) {
      return typeof value === 'string' && value !== ''
    }

    /** Read a chosen picture file, then decimate it to a PNG the Host serves. */
    async function renderPicturePng(file) {
      let source
      try {
        source = await createImageBitmap(file)
      } catch {
        throw new Error('decode-failed')
      }
      const width = source.width
      const height = source.height
      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        source.close?.()
        throw new Error('decode-failed')
      }
      // A 16M-pixel cap keeps the stored picture small without changing its framing.
      const scale = Math.min(1, Math.sqrt((16 * 1024 * 1024) / (width * height)))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(width * scale))
      canvas.height = Math.max(1, Math.round(height * scale))
      const context = canvas.getContext('2d')
      if (context === null) throw new Error('draw-failed')
      context.drawImage(source, 0, 0, canvas.width, canvas.height)
      source.close?.()
      const dataUrl = canvas.toDataURL('image/png')
      canvas.width = 0
      canvas.height = 0
      const comma = dataUrl.indexOf(',')
      if (comma === -1) throw new Error('encode-failed')
      return dataUrl.slice(comma + 1)
    }

    /** Short stable digest identifying one picked picture. */
    function digestOf(text) {
      let first = 0x811c9dc5
      let second = 0x01000193
      const step = Math.max(1, Math.floor(text.length / 4096))
      for (let index = 0; index < text.length; index += step) {
        const code = text.charCodeAt(index)
        first = Math.imul(first ^ code, 0x01000193) >>> 0
        second = Math.imul(second + code, 0x85ebca6b) >>> 0
      }
      return `${first.toString(36)}${second.toString(36)}`
    }

    /** The URL of the picked picture served by the Host half. */
    function pictureUrl(version) {
      return typeof version === 'string' && version !== ''
        ? `${PICTURE_ROUTE}?v=${encodeURIComponent(version)}`
        : PICTURE_ROUTE
    }

    /** The URL of the desktop wallpaper bytes served by the Host half. */
    function desktopUrl(digest) {
      return `${DESKTOP_ROUTE}?d=${encodeURIComponent(typeof digest === 'string' ? digest : '')}`
    }

    /** The veil color for one accepted veil value. */
    function veilColor(veil) {
      if (veil === 'dark') return 'rgba(0, 0, 0, 0.38)'
      if (veil === 'light') return 'rgba(255, 255, 255, 0.38)'
      return 'transparent'
    }

    /** One labelled row with its control on the right. */
    function Row(props) {
      return h('div', { className: 'dwp-row' }, [
        h('div', { key: 'text', className: 'dwp-text' }, [
          h('div', { key: 'title', className: 'dwp-title' }, props.title),
          props.hint === undefined ? null : h('div', { key: 'hint', className: 'dwp-hint' }, props.hint),
        ]),
        h('div', { key: 'control', className: 'dwp-control' }, props.children),
      ])
    }

    /** A select control over a fixed option list. */
    function SelectControl(props) {
      return h('select', {
        className: 'dwp-select',
        value: props.value,
        'aria-label': props.label,
        disabled: props.disabled,
        onChange: (event) => props.onChange(event.target.value),
      }, props.options.map((option) => h('option', { key: option.value, value: option.value }, option.label)))
    }

    /** Write the layer variables and the body marker the stylesheet reads. */
    function applyDocumentStyle(view) {
      if (typeof document === 'undefined') return
      const body = document.body
      const style = body.style
      // 移除激活标记即可同时恢复主框架底色，避免关闭壁纸后留下透明界面。
      if (view === undefined) {
        body.removeAttribute(LAYER_ATTRIBUTE)
        body.removeAttribute(ACTIVE_ATTRIBUTE)
        style.removeProperty('--dwp-image')
        style.removeProperty('--dwp-opacity')
        style.removeProperty('--dwp-fit')
        style.removeProperty('--dwp-veil')
        return
      }
      body.setAttribute(LAYER_ATTRIBUTE, '')
      body.setAttribute(ACTIVE_ATTRIBUTE, '')
      style.setProperty('--dwp-image', `url(${JSON.stringify(view.url)})`)
      style.setProperty('--dwp-opacity', String(view.opacity / 100))
      style.setProperty('--dwp-fit', view.fit)
      style.setProperty('--dwp-veil', view.veil)
    }

    /**
     * Build the settings page bound to this plugin's configuration form.
     * @param form - the shared configuration form of the `dsh-wallpaper` entry.
     * @param say - the page's localized text reader.
     * @returns the page component.
     */
    function createSettingsPage(form, say) {
      return function WallpaperSettingsPage() {
        // ConfigFormController 的方法依赖 this，不能直接作为 React 回调传递。
        // 保持这两个包装函数的引用稳定，同时保留对表单实例的调用上下文。
        const subscribe = React.useCallback((listener) => form.subscribe(listener), [form])
        const getSnapshot = React.useCallback(() => form.getSnapshot(), [form])
        const snapshot = React.useSyncExternalStore(subscribe, getSnapshot)
        const value = snapshot.value ?? {}
        const writable = snapshot.writable !== false
        const [error, setError] = React.useState(undefined)
        const [reading, setReading] = React.useState(false)
        const [desktop, setDesktop] = React.useState({ status: 'idle' })
        const [tick, setTick] = React.useState(0)
        const fileInput = React.useRef(null)

        const mode = pickOne(value.mode, ['none', 'picture', 'desktop'], 'none')
        const opacity = clampNumber(value.opacity, 0, 100, 35)
        const fit = pickOne(value.fit, ['cover', 'contain'], 'cover')
        const veil = pickOne(value.veil, ['none', 'dark', 'light'], 'none')
        const pollSeconds = clampNumber(value.pollSeconds, 0, 3600, 300)
        const pictureName = typeof value.pictureFileName === 'string' ? value.pictureFileName : ''
        const hasPicture = hasPictureBytes(value.pictureData)

        const refuse = () => {
          setError(say('saveFailed'))
        }

        /** Write one field. */
        const write = (field, next) => {
          setError(undefined)
          form.set(field, next).then((accepted) => {
            if (!accepted) refuse()
          }, refuse)
        }

        /** Write several fields as one atomic change. */
        const writeAll = (patch) => {
          setError(undefined)
          const ops = Object.entries(patch).map(([field, next]) => ({ op: 'set', path: [field], value: next }))
          form.mutate(ops).then((accepted) => {
            if (!accepted) refuse()
          }, refuse)
        }

        /** Ask the Host which desktop wallpaper is showing now. */
        const checkDesktop = React.useCallback(() => {
          setDesktop({ status: 'loading' })
          fetch(`${DESKTOP_INFO_ROUTE}?t=${String(Date.now())}`, { cache: 'no-store' })
            .then((response) => response.json())
            .then((info) => {
              if (info !== null && typeof info === 'object' && info.status === 'ok') setDesktop({ status: 'ready', info })
              else setDesktop({ status: 'missing' })
            })
            .catch(() => setDesktop({ status: 'missing' }))
        }, [])

        React.useEffect(() => {
          if (mode !== 'desktop') return undefined
          checkDesktop()
          if (pollSeconds <= 0) return undefined
          const timer = window.setInterval(checkDesktop, pollSeconds * 1000)
          return () => window.clearInterval(timer)
        }, [mode, pollSeconds, tick, checkDesktop])

        const onPicked = (event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file === undefined) return
          if (file.size > MAX_PICTURE_BYTES) {
            setError(say('fileTooLarge'))
            return
          }
          if (!PICTURE_EXTENSIONS.test(file.name)) {
            setError(say('unsupported'))
            return
          }
          setReading(true)
          setError(undefined)
          renderPicturePng(file).then((data) => {
            writeAll({
              pictureData: data,
              pictureFileName: file.name,
              pictureVersion: `${Date.now().toString(36)}${digestOf(data)}`,
              mode: 'picture',
            })
            setReading(false)
          }, () => {
            setReading(false)
            setError(say('readFailed'))
          })
        }

        const clearPicture = () => {
          writeAll({ pictureData: '', pictureFileName: '', pictureVersion: '', mode: 'none' })
        }

        const resetAll = () => {
          writeAll({ mode: 'none', opacity: 35, fit: 'cover', veil: 'none', pollSeconds: 300 })
        }

        const desktopHint = desktop.status === 'ready'
          ? say('currentDesktop').replace('{name}', String(desktop.info.name ?? ''))
          : desktop.status === 'loading' ? say('desktopChecking') : say('desktopMissing')

        const disabled = !writable
        const previewUrl = mode === 'picture' && hasPicture
          ? pictureUrl(value.pictureVersion)
          : mode === 'desktop' && desktop.status === 'ready'
            ? desktopUrl(desktop.info.digest)
            : ''

        return h('div', { className: 'dwp-shell' }, [
          h('div', { key: 'intro', className: 'dwp-intro' }, [
            h('div', { key: 'title', className: 'dwp-title' }, say('title')),
            h('div', { key: 'hint', className: 'dwp-hint' }, say('description')),
          ]),
          h('div', { key: 'preview', className: 'dwp-stack' }, [
            h('div', {
              key: 'frame',
              className: 'dwp-preview',
              style: {
                '--dwp-image': previewUrl === '' ? 'none' : `url(${JSON.stringify(previewUrl)})`,
                '--dwp-fit': fit,
                '--dwp-opacity': String(opacity / 100),
                '--dwp-veil': veilColor(veil),
              },
            }, [
              h('div', { key: 'layer', className: 'dwp-previewLayer' }),
              h('div', { key: 'veil', className: 'dwp-previewVeil' }),
              previewUrl === '' ? h('div', { key: 'empty', className: 'dwp-previewEmpty' }, say('noPicture')) : null,
            ]),
            h('div', { key: 'note', className: 'dwp-meta' }, say('sheetNote')),
          ]),
          h(Row, {
            key: 'mode',
            title: say('mode'),
            hint: mode === 'desktop' ? desktopHint : undefined,
          }, [
            h(SelectControl, {
              key: 'select',
              label: say('mode'),
              value: mode,
              disabled,
              options: [
                { value: 'none', label: say('modeNone') },
                { value: 'picture', label: say('modePicture') },
                { value: 'desktop', label: say('modeDesktop') },
              ],
              onChange: (next) => write('mode', next),
            }),
            mode === 'desktop' ? h('button', {
              key: 'check',
              type: 'button',
              className: 'dwp-button',
              onClick: () => setTick((count) => count + 1),
            }, say('refresh')) : null,
          ]),
          h(Row, { key: 'opacity', title: say('opacity') }, [
            h('input', {
              key: 'slider',
              className: 'dwp-slider',
              type: 'range',
              min: 0,
              max: 100,
              step: 1,
              value: opacity,
              'aria-label': say('opacity'),
              disabled,
              onChange: (event) => write('opacity', clampNumber(event.target.value, 0, 100, 35)),
            }),
            h('span', { key: 'value', className: 'dwp-value' }, `${opacity}%`),
          ]),
          h(Row, { key: 'fit', title: say('fit') }, h(SelectControl, {
            label: say('fit'),
            value: fit,
            disabled,
            options: [
              { value: 'cover', label: say('fitCover') },
              { value: 'contain', label: say('fitContain') },
            ],
            onChange: (next) => write('fit', next),
          })),
          h(Row, { key: 'veil', title: say('veil') }, h(SelectControl, {
            label: say('veil'),
            value: veil,
            disabled,
            options: [
              { value: 'none', label: say('veilNone') },
              { value: 'dark', label: say('veilDark') },
              { value: 'light', label: say('veilLight') },
            ],
            onChange: (next) => write('veil', next),
          })),
          h('div', { key: 'picture', className: 'dwp-stack' }, [
            h('div', { key: 'text', className: 'dwp-text' }, [
              h('div', { key: 'title', className: 'dwp-title' }, say('picture')),
              h('div', { key: 'file', className: 'dwp-file' }, hasPicture && pictureName !== '' ? pictureName : say('noPicture')),
              h('div', { key: 'hint', className: 'dwp-hint' }, say('fileHint')),
            ]),
            h('div', { key: 'actions', className: 'dwp-stackActions' }, [
              h('input', {
                key: 'input',
                ref: fileInput,
                type: 'file',
                accept: 'image/png,image/jpeg,image/webp,image/gif',
                style: { display: 'none' },
                onChange: onPicked,
              }),
              h('button', {
                key: 'pick',
                type: 'button',
                className: 'dwp-button dwp-buttonPrimary',
                disabled: reading || disabled,
                onClick: () => fileInput.current?.click(),
              }, reading ? say('opening') : hasPicture ? say('replace') : say('pick')),
              hasPicture ? h('button', {
                key: 'clear',
                type: 'button',
                className: 'dwp-button',
                disabled,
                onClick: clearPicture,
              }, say('clear')) : null,
            ]),
          ]),
          error === undefined ? null : h('div', {
            key: 'error',
            className: 'dwp-error',
            role: 'alert',
          }, error),
          h('div', { key: 'poll', className: 'dwp-stack' }, [
            h('div', { key: 'text', className: 'dwp-text' }, [
              h('div', { key: 'title', className: 'dwp-title' }, say('checkInterval')),
              h('div', { key: 'hint', className: 'dwp-hint' }, say('pollHint')),
            ]),
            h('div', { key: 'actions', className: 'dwp-stackActions' }, [
              h('input', {
                key: 'input',
                className: 'dwp-input',
                type: 'number',
                min: 0,
                max: 3600,
                step: 30,
                value: pollSeconds,
                'aria-label': say('checkInterval'),
                disabled,
                onChange: (event) => write('pollSeconds', clampNumber(event.target.value, 0, 3600, 300)),
              }),
              h('span', { key: 'unit', className: 'dwp-meta' }, say('pollUnit')),
            ]),
          ]),
          h('div', { key: 'footer', className: 'dwp-row' }, [
            h('div', { key: 'text', className: 'dwp-text' }),
            h('div', { key: 'actions', className: 'dwp-control' }, [
              h('button', {
                key: 'reset',
                type: 'button',
                className: 'dwp-button',
                disabled,
                onClick: resetAll,
              }, say('reset')),
            ]),
          ]),
        ])
      }
    }

    /**
     * Mount the background layer, its desktop polling, and the settings page.
     * @param ctx - the browser plugin context.
     */
    function apply(ctx) {
      const say = ctx.locale.bind('wallpaper')
      ctx.effect(() => ctx.locale.register('wallpaper', { zh, en }), 'dsh-wallpaper: dictionaries')
      ctx.effect(() => installStyles(), 'dsh-wallpaper: styles')

      const form = ctx.configForms.get(NS)
      const Page = createSettingsPage(form, say)

      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'wallpaper',
        order: 40,
        label: () => say('pageTitle'),
        locale: 'wallpaper',
      }, Page))

      /** Identity of the desktop wallpaper currently painted, '' when none. */
      let desktopDigest = ''
      /** Whether this instance already asked the Host for the desktop wallpaper. */
      let askedDesktop = false
      /** The picture URL currently painted, or '' when no source is available. */
      let pictureSource = ''

      /** Paint the document layer from the current settings snapshot. */
      const paint = () => {
        const value = form.getSnapshot().value ?? {}
        const mode = pickOne(value.mode, ['none', 'picture', 'desktop'], 'none')
        const opacity = clampNumber(value.opacity, 0, 100, 35)
        const fit = pickOne(value.fit, ['cover', 'contain'], 'cover')
        const veil = pickOne(value.veil, ['none', 'dark', 'light'], 'none')
        let url = ''
        if (mode === 'picture') {
          url = hasPictureBytes(value.pictureData) ? pictureUrl(value.pictureVersion) : ''
        } else if (mode === 'desktop') {
          url = desktopDigest === '' ? '' : desktopUrl(desktopDigest)
          if (!askedDesktop) {
            askedDesktop = true
            void checkDesktop()
          }
        }
        pictureSource = url
        if (mode === 'none' || url === '' || opacity === 0) {
          applyDocumentStyle(undefined)
          return
        }
        applyDocumentStyle({ url, opacity, fit, veil })
      }

      /** Ask the Host for the desktop wallpaper identity, then repaint when it changed. */
      async function checkDesktop() {
        let digest = ''
        try {
          const response = await fetch(`${DESKTOP_INFO_ROUTE}?t=${String(Date.now())}`, { cache: 'no-store' })
          const info = await response.json()
          if (info !== null && typeof info === 'object' && info.status === 'ok') digest = String(info.digest ?? '')
        } catch {
          digest = ''
        }
        if (digest === desktopDigest) return
        desktopDigest = digest
        paint()
      }

      /** Verify the painted picture really loads; a broken URL removes the layer. */
      const probePicture = (source) => {
        if (source === '') return
        const probe = new Image()
        probe.addEventListener('error', () => {
          if (pictureSource === source) applyDocumentStyle(undefined)
        })
        probe.src = source
      }

      ctx.effect(() => {
        let probed = ''
        const unsubscribe = form.subscribe(paint)
        paint()
        const probeTimer = window.setInterval(() => {
          if (pictureSource === probed) return
          probed = pictureSource
          probePicture(pictureSource)
        }, 750)
        return () => {
          unsubscribe()
          window.clearInterval(probeTimer)
          applyDocumentStyle(undefined)
        }
      }, 'dsh-wallpaper: document layer')

      // Check the desktop wallpaper on the configured interval while it is the source.
      ctx.effect(() => {
        let timer
        const schedule = () => {
          const value = form.getSnapshot().value ?? {}
          const watching = pickOne(value.mode, ['none', 'picture', 'desktop'], 'none') === 'desktop'
          const seconds = clampNumber(value.pollSeconds, 0, 3600, 300)
          if (watching && seconds > 0) {
            timer = window.setTimeout(() => {
              void checkDesktop()
              schedule()
            }, seconds * 1000)
            return
          }
          timer = window.setTimeout(schedule, 5000)
        }
        schedule()
        return () => window.clearTimeout(timer)
      }, 'dsh-wallpaper: desktop wallpaper polling')
    }

    // 声明服务依赖后，Cordis 才会等待提供者就绪再执行 apply。
    // 这些名字是服务名；package.json 中对应的 inject 列表使用包名。
    return { inject: ['locale', 'configForms', 'slots'], apply }
  },
})
