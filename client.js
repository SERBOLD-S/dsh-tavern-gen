/* dsh-tavern-gen 浏览器半边
 *
 * 设置 → 卡片生图，几个页签：
 *   配置     渠道表单：模型、鉴权、采样器、噪点表、CFG、宽高、比例
 *   世界书   按条目增删改，保存后自动重新生成 skill 读的 md
 *   画风预设 卡片式增删改，点圆点选当前生效的那套
 *   人物库   按角色增删改，十二块 traits 分开写
 *   服装库、画廊  服装与出图记录
 *
 * 数据全走宿主侧 /dsh-tavern-gen/api：GET /state 一次拿全，POST /save 按 target 写回。
 * 密钥不出宿主，前端只看得到 hasApiKey。
 */

window.__ModuleLoader__.load({
  id: 'dsh-tavern-gen',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports

    let React = null
    try {
      React = require('react')
    } catch (error) {
      try { console.warn('[dsh-tavern-gen] React 不可用，设置页已禁用:', error?.message) } catch {}
      exports.apply = () => {}
      exports.inject = []
      return module.exports
    }

    const h = React.createElement
    const { useEffect, useState } = React
    const API = '/dsh-tavern-gen/api'
    const clone = value => JSON.parse(JSON.stringify(value))

    const S = {
      page: { display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 2px', minHeight: 0 },
      tabs: { display: 'flex', gap: 6, flexWrap: 'wrap' },
      pill: {
        padding: '5px 13px', fontSize: 12, lineHeight: 1.4, cursor: 'pointer',
        borderRadius: 999, border: '1px solid rgba(128,128,128,.35)',
        background: 'transparent', color: 'inherit', fontFamily: 'inherit',
      },
      pillOn: { background: 'rgba(120,160,255,.20)', borderColor: 'rgba(120,160,255,.65)', fontWeight: 600 },
      hint: { fontSize: 12, lineHeight: 1.6, opacity: 0.72 },
      group: { display: 'flex', flexDirection: 'column', gap: 10 },
      card: {
        border: '1px solid rgba(128,128,128,.28)', borderRadius: 10,
        background: 'rgba(128,128,128,.05)', padding: 10,
        display: 'flex', flexDirection: 'column', gap: 8,
      },
      // 卡片头一行排开：勾选 / 标题 / 字数 / 档位 / 展开 / 删除。
      // nowrap 是关键，标题吃掉剩余宽度，其余都固定不缩。
      cardTop: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'nowrap' },
      title: {
        flex: '1 1 auto', minWidth: 0, padding: '6px 10px', fontSize: 13, fontWeight: 600,
        borderRadius: 7, border: '1px solid rgba(128,128,128,.35)', boxSizing: 'border-box',
        background: 'rgba(255,255,255,.04)', color: 'inherit', fontFamily: 'inherit',
      },
      label: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, opacity: 0.9, flex: '1 1 160px', minWidth: 120 },
      caption: { fontSize: 12, opacity: 0.66, lineHeight: 1.6 },
      input: {
        padding: '6px 9px', fontSize: 12, borderRadius: 7, width: '100%', boxSizing: 'border-box',
        border: '1px solid rgba(128,128,128,.35)', background: 'rgba(255,255,255,.04)',
        color: 'inherit', fontFamily: 'inherit',
      },
      area: {
        width: '100%', boxSizing: 'border-box', padding: 9, fontSize: 12, lineHeight: 1.55,
        borderRadius: 7, border: '1px solid rgba(128,128,128,.35)', background: 'rgba(255,255,255,.04)',
        color: 'inherit', fontFamily: 'ui-monospace, Consolas, monospace', resize: 'vertical',
      },
      row: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
      btn: {
        padding: '6px 15px', fontSize: 12, cursor: 'pointer', borderRadius: 7, flexShrink: 0,
        border: '1px solid rgba(120,160,255,.6)', background: 'rgba(120,160,255,.18)',
        color: 'inherit', fontFamily: 'inherit', fontWeight: 600,
      },
      ghost: {
        padding: '5px 12px', fontSize: 12, cursor: 'pointer', borderRadius: 7, flexShrink: 0,
        border: '1px solid rgba(128,128,128,.4)', background: 'transparent',
        color: 'inherit', fontFamily: 'inherit', whiteSpace: 'nowrap',
      },
      danger: {
        padding: '5px 11px', fontSize: 12, cursor: 'pointer', borderRadius: 7, flexShrink: 0,
        border: '1px solid rgba(217,83,79,.55)', background: 'transparent',
        color: '#d9534f', fontFamily: 'inherit', whiteSpace: 'nowrap',
      },
      off: { opacity: 0.5, cursor: 'default' },
      status: { fontSize: 12, opacity: 0.78 },
      bad: { color: '#d9534f' },
      dot: { width: 15, height: 15, accentColor: '#6f93e8', cursor: 'pointer', flex: '0 0 auto' },
      foot: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', paddingTop: 4 },
      tag: {
        fontSize: 11, padding: '2px 8px', borderRadius: 999, flexShrink: 0, whiteSpace: 'nowrap',
        border: '1px solid rgba(128,128,128,.35)', opacity: 0.8,
        // 定宽让各张卡片的字数标签上下对齐
        minWidth: 64, boxSizing: 'border-box', textAlign: 'center',
      },
    }

    // ── 基础控件 ──────────────────────────────────────────────────────
    // 三个按钮组件都接受 style 覆盖，排在最后才能盖掉基础样式。
    const Btn = props => h('button', {
      type: 'button', onClick: props.onClick, disabled: props.disabled,
      style: { ...S.btn, ...(props.disabled ? S.off : {}), ...(props.style || {}) },
    }, props.children)

    const Ghost = props => h('button', {
      type: 'button', onClick: props.onClick, disabled: props.disabled,
      style: { ...S.ghost, ...(props.disabled ? S.off : {}), ...(props.style || {}) },
    }, props.children)

    const Danger = props => h('button', {
      type: 'button', onClick: props.onClick, disabled: props.disabled,
      style: { ...S.danger, ...(props.disabled ? S.off : {}), ...(props.style || {}) },
    }, props.children)

    const Field = props => h('label', { style: { ...S.label, ...(props.style || {}) } },
      h('span', null, props.label),
      props.children,
    )

    const Input = props => h('input', {
      type: 'text', value: props.value ?? '', placeholder: props.placeholder,
      onChange: event => props.onChange(event.target.value), style: S.input,
    })

    const Area = props => h('textarea', {
      value: props.value ?? '', rows: props.rows || 6, spellCheck: false,
      onChange: event => props.onChange(event.target.value),
      style: { ...S.area, ...(props.style || {}) },
    })

    const Pick = props => h('select', {
      value: props.value ?? '',
      onChange: event => props.onChange(event.target.value), style: S.input,
    }, props.options.map(option => h('option', { key: option.value, value: option.value }, option.label)))

    // ── 世界书 ────────────────────────────────────────────────────────
    function WorldbookPage({ data, patch }) {
      const buckets = data.worldbook?.buckets ?? []
      const [bucketId, setBucketId] = useState(buckets[0]?.id ?? '')
      const [open, setOpen] = useState('')
      const bucket = buckets.find(item => item.id === bucketId) ?? buckets[0]
      const list = bucket?.entries ?? []

      const locate = (next, id) => (next.worldbook?.buckets ?? []).find(item => item.id === (bucket?.id ?? ''))
      const edit = (id, key, value) => patch(next => {
        const entry = locate(next)?.entries?.find(item => item.id === id)
        if (entry) entry[key] = value
      })
      const remove = id => patch(next => {
        const target = locate(next)
        if (target) target.entries = target.entries.filter(item => item.id !== id)
      })
      const add = () => {
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
        patch(next => {
          const target = locate(next)
          if (target) target.entries.push({ id, title: '新条目', content: '', mode: 'always', enabled: true })
        })
        setOpen(id)
      }

      return h('div', { style: S.group },
        h('div', { style: S.tabs }, buckets.map(item => h('button', {
          key: item.id, type: 'button',
          onClick: () => { setBucketId(item.id); setOpen('') },
          style: { ...S.pill, ...(item.id === bucket?.id ? S.pillOn : {}) },
        }, `${item.label || item.id}（${(item.entries ?? []).length} 条）`))),
        h('div', { style: S.hint }, bucket?.intro || '保存后自动重新生成 skill 读的文件，不用重启。'),
        list.map(item => h('div', { key: item.id, style: S.card },
          h('div', { style: S.cardTop },
            h('input', {
              type: 'checkbox', checked: item.enabled !== false, style: S.dot,
              title: item.enabled !== false ? '已启用' : '已停用，不会写进参考文件',
              onChange: event => edit(item.id, 'enabled', event.target.checked),
            }),
            h('input', {
              value: item.title, placeholder: '条目标题',
              onChange: event => edit(item.id, 'title', event.target.value), style: S.title,
            }),
            h('span', { style: S.tag }, `${(item.content || '').length} 字`),
            h('select', {
              value: item.mode || 'always',
              title: '读取档位：always 任何题材都读 / nsfw、gore 特定题材加读 / lookup 按段查 / manual 改库时读 / prescan 提交前扫',
              onChange: event => edit(item.id, 'mode', event.target.value),
              style: { ...S.tag, padding: '2px 4px', flex: '0 0 auto', width: 92, minWidth: 92 },
            }, ['always', 'nsfw', 'gore', 'lookup', 'manual', 'prescan'].map(mode =>
              h('option', { key: mode, value: mode }, mode))),
            h(Ghost, { onClick: () => setOpen(open === item.id ? '' : item.id) }, open === item.id ? '收起' : '展开'),
            h(Danger, { onClick: () => remove(item.id) }, '删除'),
          ),
          open === item.id
            ? h(Area, { value: item.content, rows: 12, onChange: value => edit(item.id, 'content', value) })
            : null,
        )),
        h('div', { style: S.foot }, h(Btn, { onClick: add }, '＋ 新增条目')),
      )
    }

    // ── 渠道配置 ──────────────────────────────────────────────────────
    const SAMPLERS = ['k_euler_ancestral', 'k_euler', 'k_dpmpp_2m', 'k_dpmpp_2m_sde', 'k_dpmpp_sde', 'ddim_v3']
    const SCHEDULES = ['karras', 'native', 'exponential', 'polyexponential']

    /** 各协议默认的生成接口路径，只做输入框占位；留空时插件内部仍按这个默认值走。 */
    function defaultGeneratePath(channel) {
      if (!channel) return ''
      const protocol = channel.options?.apiProtocol || channel.provider
      if (channel.provider === 'novelai') return channel.options?.protocol === 'chat' ? '/v1/chat/completions' : '/ai/generate-image'
      if (channel.provider === 'openai' || channel.provider === 'seedream' || channel.provider === 'grok') return '/images/generations'
      if (channel.provider === 'gemini') return '/models/<模型>:generateContent'
      if (channel.provider === 'gemini-chat') return '/chat/completions'
      if (channel.provider === 'qwen') return '/services/aigc/multimodal-generation/generation'
      if (channel.provider === 'sdwebui') return '/sdapi/v1/txt2img'
      if (protocol === 'novelai') return '/ai/generate-image'
      return '/images/generations'
    }

    function ChannelPage({ data, patch, save }) {
      const config = data.config ?? {}
      const channels = Array.isArray(config.imageChannels) ? config.imageChannels : []
      const activeId = config.activeImageChannel ?? ''
      const channel = channels.find(item => item.id === activeId)
      const opt = channel?.options ?? {}
      const providers = Array.isArray(data.providers) ? data.providers : []
      const provider = providers.find(item => item.id === channel?.provider)
      const [testState, setTestState] = useState(null)
      const local = String(config.imageBackend ?? '') === 'comfyui'
      const [comfy, setComfy] = useState(null)
      const [comfyBusy, setComfyBusy] = useState(false)
      const [workflows, setWorkflows] = useState([])
      const [workflowDefault, setWorkflowDefault] = useState('')
      const [importText, setImportText] = useState('')
      const [importName, setImportName] = useState('')
      const [wfBusy, setWfBusy] = useState(false)

      const switchBackend = value => patch(next => {
        if (value === 'comfyui') { next.config.imageBackend = 'comfyui'; return }
        const active = (next.config.imageChannels ?? []).find(item => item.id === next.config.activeImageChannel)
        next.config.imageBackend = active?.provider || next.config.imageChannels?.[0]?.provider || 'novelai'
      })

      const pullComfy = async () => {
        setComfyBusy(true)
        try {
          const response = await fetch(API + '/comfy-state', { headers: { accept: 'application/json' } })
          const value = await response.json()
          if (!response.ok) throw new Error(value?.error || 'HTTP ' + response.status)
          setComfy(value)
        } catch (error) {
          setComfy({ ok: false, error: String(error?.message ?? error) })
        } finally {
          setComfyBusy(false)
        }
      }

      const pullWorkflows = async () => {
        try {
          const response = await fetch(API + '/workflows', { headers: { accept: 'application/json' } })
          const value = await response.json()
          if (!response.ok) throw new Error(value?.error || 'HTTP ' + response.status)
          setWorkflows(Array.isArray(value.items) ? value.items : [])
          const nextDefault = String(value.defaultWorkflow ?? '')
          setWorkflowDefault(nextDefault)
          // 后端可能已经改过默认（导入、或锁定后保持不变），同步到表单，
          // 否则页面底部保存会把旧值写回去。
          patch(next => { next.config.defaultWorkflow = nextDefault })
        } catch {
          setWorkflows([])
        }
      }

      const importWorkflow = async () => {
        if (!importText.trim()) return
        setWfBusy(true)
        try {
          const response = await fetch(API + '/workflow-import', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: importName.trim(), json: importText }),
          })
          const value = await response.json()
          if (!response.ok || !value.ok) throw new Error(value?.error || 'HTTP ' + response.status)
          setImportText('')
          setImportName('')
          await pullWorkflows()
        } catch (error) {
          setComfy({ ok: false, error: '导入失败：' + String(error?.message ?? error) })
        } finally {
          setWfBusy(false)
        }
      }

      // 设为默认要落盘：下次保存配置时 data 里也必须是新值，否则会把默认工作流覆盖回空。
      const useWorkflow = async file => {
        setWfBusy(true)
        try {
          const content = { ...clone(data.config), defaultWorkflow: file }
          const response = await fetch(API + '/save', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ target: 'config', content }),
          })
          const value = await response.json()
          if (!response.ok || !value.ok) throw new Error(value?.error || 'HTTP ' + response.status)
          patch(next => { next.config.defaultWorkflow = file })
          setWorkflowDefault(file)
        } catch (error) {
          setComfy({ ok: false, error: '设置默认失败：' + String(error?.message ?? error) })
        } finally {
          setWfBusy(false)
        }
      }

      useEffect(() => {
        if (String(data.config?.imageBackend ?? '') === 'comfyui') {
          pullComfy()
          pullWorkflows()
        }
      }, [])

      // 本地后端的表单：读 /api/comfy-state 拿模型列表，保存走页面底部的同一个「保存」。
      const setConfigValue = (key, value) => patch(next => { next.config[key] = value })
      const comfyLabel = comfyBusy ? '正在读取…'
        : comfy?.ok ? `连接可用：${comfy.version || 'ComfyUI'}，${(comfy.checkpoints ?? []).length} 个 Checkpoint，${(comfy.loras ?? []).length} 个 LoRA`
          : comfy ? `连不上：${comfy.error || '检查地址'}` : '尚未探测'

      const comfyPanel = h('div', { style: S.card },
        h('div', { style: S.row },
          h(Field, { label: 'ComfyUI 地址' }, Input({
            value: config.comfyUrl ?? '', placeholder: 'http://127.0.0.1:8188',
            onChange: value => setConfigValue('comfyUrl', value),
          })),
          h(Field, { label: '鉴权方式' },
            h(Pick, {
              value: config.comfyAuthMode ?? 'none',
              options: [
                { value: 'none', label: '无鉴权' },
                { value: 'bearer', label: 'Bearer Token' },
                { value: 'basic', label: '用户名密码' },
              ],
              onChange: value => setConfigValue('comfyAuthMode', value),
            })),
        ),
        config.comfyAuthMode === 'bearer'
          ? h(Field, { label: 'Token', style: { flex: '0 0 auto' } }, h('input', {
            type: 'password', value: config.comfyAuthToken ?? '', spellCheck: false,
            onChange: event => setConfigValue('comfyAuthToken', event.target.value), style: S.input,
          }))
          : null,
        config.comfyAuthMode === 'basic'
          ? h('div', { style: S.row },
            h(Field, { label: '用户名' }, Input({ value: config.comfyAuthUser ?? '', onChange: value => setConfigValue('comfyAuthUser', value) })),
            h(Field, { label: '密码' }, h('input', {
              type: 'password', value: config.comfyAuthPass ?? '', spellCheck: false,
              onChange: event => setConfigValue('comfyAuthPass', event.target.value), style: S.input,
            })))
          : null,
        h('div', { style: S.row },
          h(Btn, { onClick: pullComfy, disabled: comfyBusy }, comfyBusy ? '读取中…' : '测试连接 / 刷新模型'),
          h('span', {
            style: { fontSize: 12, opacity: 0.8, ...(comfy && !comfy.ok && !comfyBusy ? { color: '#d9534f' } : {}) },
          }, comfyLabel),
        ),
        h('div', { style: { borderTop: '1px solid rgba(128,128,128,.25)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 8 } },
          h('div', { style: S.row },
            h('span', { style: { fontSize: 13, fontWeight: 600 } }, `工作流（${workflows.length} 张）`),
            h(Ghost, { onClick: pullWorkflows, disabled: wfBusy }, wfBusy ? '处理中…' : '重新扫描'),
            h('span', { style: S.tag }, '当前：' + (workflowDefault || '未设置')),
          ),
          h('div', { style: S.hint }, '从 ComfyUI 导出「API 格式」的 JSON 粘贴进来，插件会自己识别正负面提示词、尺寸、步数、底模和 LoRA。没锁定时，导入后自动设为默认。'),
          h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, opacity: 0.85 } },
            h('input', {
              type: 'checkbox', checked: config.lockWorkflow === true,
              onChange: event => setConfigValue('lockWorkflow', event.target.checked),
            }),
            '锁定（导入新工作流时不自动切换默认，「设为默认」也禁用）'),
          h('div', { style: S.row },
            h(Ghost, { onClick: pullComfy, disabled: comfyBusy }, comfyBusy ? '读取中…' : '读 LoRA 列表'),
            h('span', { style: S.tag }, `LoRA：${(comfy?.loras ?? []).length} 个`),
          ),
          comfy?.ok && (comfy.loras ?? []).length
            ? h('div', { style: { fontSize: 11, opacity: 0.7, lineHeight: 1.6, maxHeight: 90, overflow: 'auto' } }, (comfy.loras ?? []).join('、'))
            : null,
          workflows.length
            ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
              workflows.map(item => h('div', { key: item.file, style: S.cardTop },
                h('span', {
                  style: { flex: '1 1 auto', minWidth: 0, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
                }, `${item.name} · ${item.nodes} 节点`),
                h('span', { style: S.tag }, item.positive && item.negative ? '正负可识别' : '绑定不全'),
                h(Ghost, {
                  onClick: () => useWorkflow(item.file),
                  disabled: wfBusy || config.lockWorkflow === true,
                  style: item.file === workflowDefault ? { borderColor: 'rgba(120,160,255,.65)' } : undefined,
                }, item.file === workflowDefault ? '当前默认' : '设为默认'),
              )))
            : h('div', { style: S.hint }, '还没有工作流。把 API JSON 贴进下面的框，点「导入工作流」。'),
          h('div', { style: S.row },
            h('input', {
              value: importName, placeholder: '工作流名字（可留空）',
              onChange: event => setImportName(event.target.value),
              style: { ...S.input, flex: '1 1 160px' },
            }),
            h(Btn, { onClick: importWorkflow, disabled: wfBusy || !importText.trim() }, wfBusy ? '处理中…' : '导入工作流'),
          ),
          h('textarea', {
            value: importText, rows: 5, spellCheck: false,
            placeholder: '粘贴 ComfyUI 导出的 API 格式 JSON',
            onChange: event => setImportText(event.target.value),
            style: { ...S.area, fontFamily: 'ui-monospace, Consolas, monospace' },
          }),
        ),
        h('div', { style: S.caption }, '本地出图只跑导入的工作流，没有工作流就会直接报错。尺寸、步数、CFG 都读工作流里的值，工具传 size 时才覆盖尺寸。改完点底部保存。'),
      )

      // 先落盘再探活：后端测的是已保存的渠道，用未保存的表单测没有意义。
      const runTest = async () => {
        if (!channel) return
        setTestState({ checking: true })
        try {
          await save()
          const response = await fetch(API + '/test-channel', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ id: channel.id }),
          })
          const value = await response.json()
          if (!response.ok) throw new Error(value?.error || 'HTTP ' + response.status)
          setTestState({ checking: false, ...value })
        } catch (error) {
          setTestState({ checking: false, ok: false, status: 'error', message: String(error?.message ?? error) })
        }
      }

      const testLabel = testState?.checking ? '正在探测渠道…'
        : testState?.ok && testState?.status === 'reachable' ? '连接可用' + (testState.message ? '：' + testState.message : '')
          : testState?.status === 'configured' ? '已配置，尚未验证：' + (testState.message || '此服务没有可安全探测的接口。')
            : testState ? '无法连接：' + (testState.message || testState.error || '检查地址与鉴权')
              : (channel?.hasApiKey || channel?.hasPassword ? '已配置，尚未验证' : '填写地址和鉴权后保存并测试')
      const pathPlaceholder = defaultGeneratePath(channel)

      const setChannel = (key, value) => patch(next => {
        const target = next.config.imageChannels.find(item => item.id === activeId)
        if (target) target[key] = value
      })
      const setOption = (key, value) => patch(next => {
        const target = next.config.imageChannels.find(item => item.id === activeId)
        if (target) target.options = { ...(target.options || {}), [key]: value }
      })
      const applyProvider = id => patch(next => {
        const target = next.config.imageChannels.find(item => item.id === activeId)
        const found = providers.find(item => item.id === id)
        if (!target || !found) return
        target.provider = found.id
        target.baseUrl = found.baseUrl
        target.model = found.model
        if (!target.name || target.name === '新渠道') target.name = found.label
      })
      const addChannel = () => patch(next => {
        const base = providers[0] ?? { id: 'novelai', label: 'NovelAI', baseUrl: '', model: '' }
        const id = 'ch-' + Date.now().toString(36)
        next.config.imageChannels.push({
          id, provider: base.id, name: '新渠道', baseUrl: base.baseUrl, model: base.model,
          authMode: 'bearer', username: '', apiKey: '', password: '', options: {},
        })
        next.config.activeImageChannel = id
      })
      const removeChannel = () => patch(next => {
        next.config.imageChannels = next.config.imageChannels.filter(item => item.id !== activeId)
        next.config.activeImageChannel = next.config.imageChannels[0]?.id ?? ''
      })

      return h('div', { style: S.group },
        h('div', { style: S.row },
          h(Field, { label: '生图后端' },
            h(Pick, {
              value: local ? 'comfyui' : 'cloud',
              options: [{ value: 'cloud', label: '云端渠道' }, { value: 'comfyui', label: '本地 ComfyUI' }],
              onChange: value => switchBackend(value),
            })),
          h('span', { style: S.status }, local ? '本地出图，不需要密钥' : '走下面选中的云端渠道'),
        ),
        local ? comfyPanel : [
          h('div', { style: S.hint }, '这里改的是渠道本身。密钥存在 DSH 的凭据服务里，这个页面只看得到状态。'),
        h('div', { style: S.row },
          h(Field, { label: '当前渠道' },
            h(Pick, {
              value: activeId,
              options: channels.length
                ? channels.map(item => ({ value: item.id, label: `${item.name || item.id}（${item.provider}）` }))
                : [{ value: '', label: '（还没有渠道）' }],
              onChange: value => patch(next => { next.config.activeImageChannel = value }),
            })),
          h(Btn, { onClick: addChannel }, '＋ 新增渠道'),
          channel ? h(Danger, { onClick: removeChannel }, '删除这个渠道') : null,
        ),
        channel ? h('div', { style: S.card },
          h('div', { style: S.row },
            h(Field, { label: '渠道类型' },
              h(Pick, {
                value: channel.provider ?? 'novelai',
                options: providers.map(item => ({ value: item.id, label: item.label })),
                onChange: applyProvider,
              })),
            h(Field, { label: '名称' }, Input({ value: channel.name, onChange: value => setChannel('name', value) })),
          ),
          h('div', { style: S.row },
            h(Field, { label: '模型' },
              (() => {
                const choices = (data.models?.[channel.provider] ?? [])
                const known = choices.some(item => item[0] === channel.model)
                const options = choices.map(item => h('option', { key: item[0], value: item[0] }, item[1]))
                options.push(h('option', { key: '__custom', value: '__custom' },
                  known ? '自定义…' : `自定义：${channel.model || '未填'}`))
                return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                  h('select', {
                    value: known ? channel.model : '__custom',
                    onChange: event => {
                      if (event.target.value !== '__custom') setChannel('model', event.target.value)
                    },
                    style: S.input,
                  }, options),
                  known ? null : h('input', {
                    type: 'text', value: channel.model ?? '', placeholder: '填模型 ID，例如 nai-diffusion-4-5-full',
                    onChange: event => setChannel('model', event.target.value), style: S.input,
                  }),
                )
              })()),
            h(Field, { label: '服务地址' }, Input({
              value: channel.baseUrl, placeholder: provider?.baseUrl || 'https://…',
              onChange: value => setChannel('baseUrl', value),
            })),
          ),
          h('div', { style: S.row },
            h(Field, { label: '鉴权方式' },
              h(Pick, {
                value: channel.authMode ?? 'bearer',
                options: [
                  { value: 'bearer', label: 'Bearer API Key' },
                  { value: 'basic', label: '用户名密码' },
                  { value: 'none', label: '无鉴权' },
                ],
                onChange: value => setChannel('authMode', value),
              })),
            h(Field, { label: 'API Key' },
              h('input', {
                type: 'password', value: channel.apiKey ?? '', spellCheck: false,
                placeholder: channel.hasApiKey ? '已保存，输入新值覆盖' : '未配置，粘贴密钥',
                onChange: event => setChannel('apiKey', event.target.value), style: S.input,
              })),
          ),
          channel.authMode === 'basic'
            ? h('div', { style: S.row },
              h(Field, { label: '用户名' }, Input({ value: channel.username ?? '', onChange: value => setChannel('username', value) })),
              h(Field, { label: '密码' },
                h('input', {
                  type: 'password', value: channel.password ?? '', spellCheck: false,
                  placeholder: channel.hasPassword ? '已保存，输入新值覆盖' : '未配置',
                  onChange: event => setChannel('password', event.target.value), style: S.input,
                })))
            : null,
          h('div', { style: S.caption }, '保存后写进 DSH 凭据库（前缀 DSH_TAVERN_GEN_），config.json 里不留明文；留空表示沿用已保存的值。'),
          h('div', { style: S.row },
            h(Field, { label: '采样器' },
              h(Pick, {
                value: opt.sampler ?? 'k_euler_ancestral',
                options: SAMPLERS.map(value => ({ value, label: value })),
                onChange: value => setOption('sampler', value),
              })),
            h(Field, { label: '噪点表' },
              h(Pick, {
                value: opt.noiseSchedule ?? 'karras',
                options: SCHEDULES.map(value => ({ value, label: value })),
                onChange: value => setOption('noiseSchedule', value),
              })),
          ),
          h('div', { style: S.row },
            h(Field, { label: 'CFG' }, Input({ value: opt.cfg ?? '5', onChange: value => setOption('cfg', value) })),
            h(Field, { label: 'CFG Rescale' }, Input({ value: opt.cfgRescale ?? '0', onChange: value => setOption('cfgRescale', value) })),
          ),
          h('div', { style: S.row },
            h(Field, { label: '宽（像素）' }, Input({ value: opt.sizeWidth ?? '832', onChange: value => setOption('sizeWidth', value) })),
            h(Field, { label: '高（像素）' }, Input({ value: opt.sizeHeight ?? '1216', onChange: value => setOption('sizeHeight', value) })),
            h(Field, { label: '画面比例覆盖（可选）' }, Input({ value: opt.aspectRatio ?? '', placeholder: '例如 2:3', onChange: value => setOption('aspectRatio', value) })),
          ),
          h('div', { style: S.caption }, '这里的宽高是不传 size 时的默认值；gen_image 传了 size（竖图/横图/方图）就以参数为准，只影响那一次。比例覆盖再盖一层。'),
          pathPlaceholder ? h(Field, { label: '生成接口路径（高级）', style: { flex: '0 0 auto' } }, Input({
            value: opt.generatePath ?? '', placeholder: pathPlaceholder,
            onChange: value => setOption('generatePath', value),
          })) : null,
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 4 } },
            h(Btn, { onClick: runTest, disabled: Boolean(testState?.checking) }, testState?.checking ? '测试中…' : '保存并测试连接'),
            h('span', {
              style: {
                fontSize: 12, opacity: 0.8,
                ...(testState && !testState.checking && !testState.ok ? { color: '#d9534f' } : {}),
              },
            }, testLabel),
          ),
          h('div', { style: S.caption }, '生成接口路径留空就用默认值，改了只影响这条渠道。'),
          h('div', { style: S.caption },
            channel.provider === 'novelai'
              ? (opt.protocol === 'chat'
                ? '对话格式用于把 NovelAI 包成 chat/completions 的中转站：地址填中转站根地址，模型选 NovelAI 模型，采样器会自动拼进模型名。'
                : 'NovelAI 原生格式：地址填官方或同协议中转的根地址，密钥用 API Key。')
              : channel.provider === 'openai'
                ? '支持 OpenAI 图片 API 和兼容中转；模型 ID 建议来自服务端模型列表，中转可以改生成路径。'
                : channel.provider === 'gemini'
                  ? 'Gemini 原生接口，模型名填在「模型」里，比例和分辨率走下面的覆盖参数。'
                  : channel.provider === 'qwen'
                    ? '百炼根地址要匹配账号地域；生成路径可按控制台给的端点修改。'
                    : channel.provider === 'sdwebui'
                      ? 'SD WebUI / Forge 本地地址，生成路径默认 /sdapi/v1/txt2img。'
                      : '自定义兼容渠道按所选协议发请求，生成路径可以覆盖。'),
        ) : h('div', { style: S.hint }, '还没有渠道。点上面的「＋ 新增渠道」建一个。'),
        ],
      )
    }

    // ── 画风预设 ──────────────────────────────────────────────────────
    function PresetPage({ data, patch }) {
      const config = data.config ?? {}
      const presets = Array.isArray(config.stylePresets) ? config.stylePresets : []
      const activeId = config.activePreset ?? ''
      const [open, setOpen] = useState('')
      const DEFAULT_KEY = '__default__'

      const edit = (id, key, value) => patch(next => {
        const target = next.config.stylePresets.find(item => item.id === id)
        if (target) target[key] = value
      })
      const editDefault = (key, value) => patch(next => { next.config[key] = value })
      const remove = id => patch(next => {
        next.config.stylePresets = next.config.stylePresets.filter(item => item.id !== id)
      })
      const add = () => patch(next => {
        next.config.stylePresets.push({
          id: 'p' + Date.now().toString(36), name: '新画风', artist: '', negative: '',
          position: 'prefix', enabled: true, params: {},
        })
      })
      const toggle = id => setOpen(current => current === id ? '' : id)

      return h('div', { style: S.group },
        h('div', { style: S.row },
          h('span', { style: { fontSize: 13, fontWeight: 600, marginRight: 6 } }, `画风预设（${presets.length} 套）`),
          h('span', { style: S.tag }, '当前：' + (presets.find(item => item.id === activeId)?.name || '默认')),
          h(Btn, { onClick: add }, '＋ 新增一套'),
          h(Ghost, { onClick: () => patch(next => { next.config.activePreset = '' }) }, '不用预设（回默认）'),
        ),
        h('div', { style: S.hint }, '每套可以带自己的画师串、风格词和负面词。点左边圆点选中，生成时就用那套；点「展开」才显示内容。'),
        h('div', { style: S.card },
          h('div', { style: S.cardTop },
            h('span', {
              style: { flex: '1 1 auto', minWidth: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
            }, '默认画风（不用预设时）'),
            h('span', { style: S.tag }, activeId ? '未启用' : '当前使用'),
            h(Ghost, { onClick: () => toggle(DEFAULT_KEY) }, open === DEFAULT_KEY ? '收起' : '展开'),
          ),
          open === DEFAULT_KEY ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            h('div', { style: S.hint }, '只在没有选中任何预设时生效；选中了某套，就用那套的串。'),
            h(Field, { label: '正面：默认画师串 / 风格词', style: { flex: '0 0 auto' } }, Area({
              value: config.styleArtists ?? '', rows: 3, onChange: value => editDefault('styleArtists', value),
            })),
            h(Field, { label: '默认负面词（会并进负面）', style: { flex: '0 0 auto' } }, Area({
              value: config.styleNegative ?? '', rows: 4, onChange: value => editDefault('styleNegative', value),
            })),
          ) : null,
        ),
        presets.map(item => h('div', { key: item.id, style: S.card },
          h('div', { style: S.cardTop },
            h('input', {
              type: 'radio', name: 'dsh-tavern-gen-preset', checked: item.id === activeId,
              title: '选这套', style: S.dot,
              onChange: () => patch(next => { next.config.activePreset = item.id }),
            }),
            h('input', {
              value: item.name, placeholder: '这套的名字',
              onChange: event => edit(item.id, 'name', event.target.value), style: S.title,
            }),
            h('select', {
              value: item.position ?? 'prefix',
              onChange: event => edit(item.id, 'position', event.target.value),
              style: { ...S.input, width: 132, flex: '0 0 auto' },
            },
              h('option', { value: 'prefix' }, '放在最前面'),
              h('option', { value: 'suffix' }, '放在最后面')),
            h(Ghost, { onClick: () => toggle(item.id) }, open === item.id ? '收起' : '展开'),
            h(Danger, { onClick: () => remove(item.id) }, '删除'),
          ),
          open === item.id ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            h(Field, { label: '正面：画师串 / 风格词', style: { flex: '0 0 auto' } }, Area({
              value: item.artist, rows: 3, onChange: value => edit(item.id, 'artist', value),
            })),
            h(Field, { label: '这套的负面固定词（会并进负面）', style: { flex: '0 0 auto' } }, Area({
              value: item.negative, rows: 3, onChange: value => edit(item.id, 'negative', value),
            })),
          ) : null,
        )),
      )
    }

    // ── 人物库 ────────────────────────────────────────────────────────
    const TRAIT_LABEL = {
      face: '正面头面部', faceBack: '背面头面部',
      bodySFW: '身体 · 常规', bodySFWBack: '身体背面 · 常规',
      lowerSFW: '下半身 · 常规', lowerSFWBack: '下半身背面 · 常规',
      bodyNSFW: '身体 · 细节', bodyNSFWBack: '身体背面 · 细节',
      lowerNSFW: '下半身 · 细节', lowerNSFWBack: '下半身背面 · 细节',
      feature: '气质描述（出图不用）', negative: '专属负面词',
    }

    const TRAIT_GROUPS = [
      { title: '常规外观', open: true, keys: ['face', 'faceBack', 'bodySFW', 'bodySFWBack', 'lowerSFW', 'lowerSFWBack'] },
      { title: '细节外观', open: false, keys: ['bodyNSFW', 'bodyNSFWBack', 'lowerNSFW', 'lowerNSFWBack'] },
      { title: '其他', open: false, keys: ['feature', 'negative'] },
    ]

    function CharacterPage({ data, patch }) {
      const [open, setOpen] = useState('')
      const list = Array.isArray(data.characters?.characters) ? data.characters.characters : []

      const edit = (index, key, value) => patch(next => {
        const target = next.characters.characters[index]
        if (target) target[key] = value
      })
      const editTrait = (index, key, value) => patch(next => {
        const target = next.characters.characters[index]
        if (!target) return
        target.traits = { ...(target.traits || {}), [key]: value }
      })
      const remove = index => patch(next => { next.characters.characters.splice(index, 1) })
      const add = () => patch(next => {
        next.characters.characters.push({
          id: 'c' + Date.now().toString(36), enabled: true, name: '新角色',
          match: '', note: '', traits: {}, outfits: [],
        })
      })

      return h('div', { style: S.group },
        h('div', { style: S.row },
          h('span', { style: { fontSize: 13, fontWeight: 600, marginRight: 6 } }, `人物库（${list.length} 个角色）`),
          h(Btn, { onClick: add }, '＋ 新增角色'),
        ),
        h('div', { style: S.hint }, '这里的 tag 会原样拼进提示词。年龄词要同时出现在正面和背面头面部里，否则出图会飘。'),
        list.map((item, index) => h('div', { key: item.id || index, style: S.card },
          h('div', { style: S.cardTop },
            h('input', {
              type: 'checkbox', checked: item.enabled !== false, style: S.dot,
              title: '停用后 read_character 不会返回它',
              onChange: event => edit(index, 'enabled', event.target.checked),
            }),
            h('input', {
              value: item.name ?? '', placeholder: '角色名',
              onChange: event => edit(index, 'name', event.target.value), style: S.title,
            }),
            h(Ghost, { onClick: () => setOpen(open === item.id ? '' : item.id) }, open === item.id ? '收起' : '展开'),
            h(Danger, { onClick: () => remove(index) }, '删除'),
          ),
          open === item.id ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            h(Field, { label: '角色说明（给规划模型看的，可留空）', style: { flex: '0 0 auto' } }, Input({
              value: item.note ?? '', onChange: value => edit(index, 'note', value),
            })),
            TRAIT_GROUPS.map(group => h('details', {
              key: group.title, open: group.open,
              style: { borderTop: '1px solid rgba(128,128,128,.2)', paddingTop: 8 },
            },
              h('summary', {
                style: { cursor: 'pointer', fontSize: 12, fontWeight: 600, opacity: 0.85 },
              }, `${group.title}（${group.keys.length}）`),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8 } },
                group.keys.map(key => h(Field, {
                  key, label: TRAIT_LABEL[key] || key, style: { flex: '0 0 auto' },
                }, Area({
                  value: item.traits?.[key] ?? '',
                  rows: String(item.traits?.[key] ?? '').length > 120 ? 4 : 2,
                  onChange: value => editTrait(index, key, value),
                }))),
              ),
            )),
          ) : null,
        )),
      )
    }

    // ── 服装库 ────────────────────────────────────────────────────────
    const OUTFIT_FIELDS = [
      ['upper', '上身'],
      ['lower', '下身'],
      ['shoes', '鞋'],
      ['accessory', '配饰'],
      ['full', '整套兜底'],
      ['back', '背影补充'],
      ['negative', '负面'],
    ]

    function OutfitPage({ data, patch }) {
      const [open, setOpen] = useState('')
      const list = Array.isArray(data.outfits?.outfits) ? data.outfits.outfits : []

      const edit = (index, key, value) => patch(next => {
        const target = next.outfits.outfits[index]
        if (target) target[key] = value
      })
      const remove = index => patch(next => { next.outfits.outfits.splice(index, 1) })
      const add = () => patch(next => {
        next.outfits.outfits.push({
          id: 'o' + Date.now().toString(36), name: '新服装', enabled: true,
          upper: '', lower: '', shoes: '', accessory: '', full: '', back: '', negative: '',
        })
      })

      return h('div', { style: S.group },
        h('div', { style: S.row },
          h('span', { style: { fontSize: 13, fontWeight: 600, marginRight: 6 } }, `服装库（${list.length} 套）`),
          h(Btn, { onClick: add }, '＋ 新增一套'),
        ),
        h('div', { style: S.hint }, '只写服装本身：面料、版型、颜色、配饰。不写身体，不写年龄。正面取上身/下身/鞋/配饰，背影再加补充，单件凑不齐时用整套兜底。'),
        list.length === 0
          ? h('div', { style: S.hint }, '还没有服装。点上面的「＋ 新增一套」建一套。')
          : list.map((item, index) => h('div', { key: item.id || index, style: S.card },
            h('div', { style: S.cardTop },
              h('input', {
                type: 'checkbox', checked: item.enabled !== false, style: S.dot,
                title: '停用后 read_outfit 不会返回它',
                onChange: event => edit(index, 'enabled', event.target.checked),
              }),
              h('input', {
                value: item.name ?? '', placeholder: '服装名',
                onChange: event => edit(index, 'name', event.target.value), style: S.title,
              }),
              h(Ghost, { onClick: () => setOpen(open === item.id ? '' : item.id) }, open === item.id ? '收起' : '展开'),
              h(Danger, { onClick: () => remove(index) }, '删除'),
            ),
            open === item.id ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              OUTFIT_FIELDS.map(([key, label]) => h(Field, {
                key, label: key === 'negative' ? '负面（这套不该出现的，写进 negative 参数）' : label,
                style: { flex: '0 0 auto' },
              }, Area({
                value: item[key] ?? '',
                rows: ['upper', 'lower', 'full', 'negative'].includes(key) ? 2 : 1,
                onChange: value => edit(index, key, value),
              }))),
            ) : null,
          )),
      )
    }

    // ── 画廊 ──────────────────────────────────────────────────────────
    function GalleryPage() {
      const [items, setItems] = useState(null)
      const [zoom, setZoom] = useState(null)
      const [status, setStatus] = useState('')
      const [busy, setBusy] = useState(false)

      async function pull() {
        setBusy(true)
        try {
          const response = await fetch(API + '/gallery', { headers: { accept: 'application/json' } })
          const value = await response.json()
          if (!response.ok) throw new Error(value?.error || 'HTTP ' + response.status)
          setItems(value.items ?? [])
          setStatus('')
        } catch (error) {
          setStatus('读取失败：' + (error?.message ?? error))
        } finally {
          setBusy(false)
        }
      }

      useEffect(() => { pull() }, [])

      async function remove(id) {
        try {
          const response = await fetch(API + '/gallery-delete', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ id }),
          })
          const value = await response.json()
          if (!response.ok || !value.ok) throw new Error(value?.error || 'HTTP ' + response.status)
          setStatus('已删除（记录和图片文件一起删了）')
          await pull()
        } catch (error) {
          setStatus('删除失败：' + (error?.message ?? error))
        }
      }

      async function clearAll() {
        const ask = typeof window !== 'undefined' && typeof window.confirm === 'function'
        if (ask && !window.confirm('会删掉全部图片文件和记录，删了找不回来。确定？')) return
        setBusy(true)
        try {
          const response = await fetch(API + '/gallery-clear', { method: 'POST' })
          const value = await response.json()
          if (!response.ok || !value.ok) throw new Error(value?.error || 'HTTP ' + response.status)
          setStatus(`已清空 ${value.removed ?? 0} 张`)
          await pull()
        } catch (error) {
          setStatus('清空失败：' + (error?.message ?? error))
        } finally {
          setBusy(false)
        }
      }

      // 复制到剪贴板。navigator.clipboard 在非安全上下文或权限被拒时会抛，
      // 这时退回 textarea + execCommand，老办法但到处都能用。
      async function copyText(text, label) {
        const value = String(text || '')
        if (!value) { setStatus(`这张图没有存 ${label}`); return }
        try {
          if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            await navigator.clipboard.writeText(value)
          } else throw new Error('no clipboard api')
          setStatus(`已复制 ${label}（${value.length} 字）`)
        } catch {
          try {
            const ta = document.createElement('textarea')
            ta.value = value
            ta.style.position = 'fixed'
            ta.style.opacity = '0'
            document.body.appendChild(ta)
            ta.select()
            const ok = document.execCommand('copy')
            document.body.removeChild(ta)
            setStatus(ok ? `已复制 ${label}（${value.length} 字）` : `复制失败，${label} 需要手动选中`)
          } catch {
            setStatus(`复制失败，${label} 需要手动选中`)
          }
        }
      }

      const list = items ?? []

      return h('div', { style: S.group },
        h('div', { style: S.row },
          h('span', { style: { fontSize: 13, fontWeight: 600, marginRight: 6 } }, `画廊（${list.length} 张）`),
          h(Ghost, { onClick: pull, disabled: busy }, busy ? '读取中…' : '重新读取'),
          list.length ? h(Danger, { onClick: clearAll, disabled: busy }, '清空全部') : null,
          status ? h('span', { style: S.status }, status) : null,
        ),
        h('div', { style: S.hint }, '每次 gen_image 出的图都会记在这里。点开放大。删除会同时删掉记录和图片文件，删了找不回来。'),
        items === null
          ? h('div', { style: S.hint }, '正在读取…')
          : list.length === 0
            ? h('div', { style: S.hint }, '还没有图。让 Agent 出一张就会出现在这里。')
            : h('div', {
              style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(196px, 1fr))', gap: 10 },
            }, list.map(item => h('div', { key: item.id, style: { ...S.card, padding: 6, gap: 6 } },
              h('img', {
                src: item.url, alt: item.prompt || item.file, loading: 'lazy',
                onClick: () => setZoom(item),
                style: { width: '100%', borderRadius: 6, cursor: 'zoom-in', display: 'block', background: 'rgba(0,0,0,.15)' },
              }),
              h('div', { style: { fontSize: 11, opacity: 0.7, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                item.preset || '默认画风'),
              h('div', { style: { fontSize: 11, opacity: 0.55 } },
                new Date(item.at || Date.now()).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })),
              // 三个按钮一行：两个复制平分宽度，删除窄且红，避免误点。
              h('div', { style: { display: 'flex', gap: 5, alignItems: 'stretch' } },
                h(Ghost, {
                  onClick: () => copyText(item.prompt, 'prompt'), title: '复制这一张的完整 prompt',
                  style: { flex: '1 1 0', minWidth: 0, padding: '4px 4px', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis' },
                }, '提示词'),
                h(Ghost, {
                  onClick: () => copyText(item.negative, 'negative'), title: '复制这一张的 negative',
                  style: { flex: '1 1 0', minWidth: 0, padding: '4px 4px', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis' },
                }, '负面'),
                h(Danger, {
                  onClick: () => remove(item.id), title: '删除记录和图片文件',
                  style: { flex: '0 0 auto', padding: '4px 9px', fontSize: 11 },
                }, '×'),
              ),
            ))),
        zoom ? h('div', {
          onClick: () => setZoom(null),
          style: {
            position: 'fixed', inset: 0, zIndex: 2147483600, background: 'rgba(0,0,0,.86)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, cursor: 'zoom-out',
          },
        }, h('img', {
          src: zoom.url, alt: zoom.prompt || '', style: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 },
        })) : null,
      )
    }

    // ── 主面板 ────────────────────────────────────────────────────────
    const PAGES = [
      { id: 'config', label: '配置' },
      { id: 'worldbook', label: '世界书' },
      { id: 'presets', label: '画风预设' },
      { id: 'characters', label: '人物库' },
      { id: 'outfits', label: '服装库' },
      { id: 'gallery', label: '画廊' },
    ]
    const TARGET = {
      worldbook: 'worldbook', config: 'config', presets: 'config',
      characters: 'characters', outfits: 'outfits',
    }

    function SettingsPanel() {
      const [page, setPage] = useState('config')
      const [data, setData] = useState(null)
      const [busy, setBusy] = useState(false)
      const [status, setStatus] = useState('')
      const [failed, setFailed] = useState(false)

      async function pull() {
        setBusy(true)
        setFailed(false)
        setStatus('读取中…')
        try {
          const response = await fetch(API + '/state', { headers: { accept: 'application/json' } })
          const value = await response.json()
          if (!response.ok) throw new Error(value?.error || 'HTTP ' + response.status)
          setData(value)
          setStatus('')
        } catch (error) {
          setFailed(true)
          setStatus('读取失败：' + (error?.message ?? error))
        } finally {
          setBusy(false)
        }
      }

      useEffect(() => { pull() }, [])

      function patch(mutate) {
        setData(previous => {
          if (!previous) return previous
          const next = clone(previous)
          mutate(next)
          return next
        })
      }

      async function save() {
        if (!data) return
        const target = TARGET[page]
        let content
        if (target === 'config') {
          const config = clone(data.config)
          if (Array.isArray(config.imageChannels)) {
            for (const channel of config.imageChannels) {
              if (!channel) continue
              delete channel.hasApiKey
              delete channel.hasPassword
            }
          }
          content = config
        } else if (target === 'worldbook') {
          content = data.worldbook
        } else if (target === 'outfits') {
          content = data.outfits
        } else {
          content = data.characters
        }
        setBusy(true)
        setFailed(false)
        setStatus('保存中…')
        try {
          const response = await fetch(API + '/save', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ target, content }),
          })
          const value = await response.json()
          if (!response.ok || !value.ok) throw new Error(value?.error || 'HTTP ' + response.status)
          setStatus(`已保存（${value.bytes} 字节）`)
          await pull()
        } catch (error) {
          setFailed(true)
          setStatus('保存失败：' + (error?.message ?? error))
        } finally {
          setBusy(false)
        }
      }

      const body = page === 'gallery'
        ? h(GalleryPage)
        : !data
          ? h('div', { style: S.hint }, status || '正在读取配置…')
          : page === 'worldbook' ? h(WorldbookPage, { data, patch })
          : page === 'config' ? h(ChannelPage, { data, patch, save })
          : page === 'presets' ? h(PresetPage, { data, patch })
          : page === 'outfits' ? h(OutfitPage, { data, patch })
          : h(CharacterPage, { data, patch })

      return h('div', { style: S.page },
        h('div', { style: S.tabs }, PAGES.map(item => h('button', {
          key: item.id, type: 'button',
          onClick: () => { setPage(item.id); setStatus(''); setFailed(false) },
          style: { ...S.pill, ...(item.id === page ? S.pillOn : {}) },
        }, item.label))),
        body,
        page === 'gallery' ? null : h('div', { style: S.foot },
          h(Btn, { onClick: save, disabled: busy || !data }, busy ? '处理中…' : '保存'),
          h(Ghost, { onClick: pull, disabled: busy }, '重新读取'),
          status ? h('span', { style: { ...S.status, ...(failed ? S.bad : {}) } }, status) : null,
        ),
      )
    }

    exports.apply = (ctx) => {
      try {
        ctx.slots?.inject?.('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: 'dsh-tavern-gen',
          order: 190,
          label: () => '卡片生图',
        }, SettingsPanel))
      } catch (error) {
        try { console.warn('[dsh-tavern-gen] 设置页面未注册:', error?.message) } catch {}
      }
    }

    // Cordis 注入的是「服务名」，不是包名：slots 由 @deepseek-ai/dsh-client-ui-slots 提供。
    // 写成包名会永远 pending，web boot 直接判定插件未激活，整页卡在启动画面。
    exports.inject = ['slots']
    return module.exports
  },
})
