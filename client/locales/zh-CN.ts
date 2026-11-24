import fileUi from '../extensions/nocobase-file-component-ui/locales/zh-CN.js';
import agentChat from '../extensions/nocobase-agent-chat/locales/zh-CN.js';
import type { AppResource } from './en-US.js';
import systemZhCN from './system/zh-CN.js';

const zhCN: AppResource = {
  // The template's own copy; see `./en-US.ts`.
  ...systemZhCN,
  ...fileUi,
  releaseApps: {
    title: '应用管理',
    description: '维护可提交上线申请的应用；应用只停用，不删除。',
    askAi: 'AI 对话',
    create: '新建应用',
    edit: '编辑应用',
    name: '应用名称',
    code: '应用编码',
    owner: '负责人',
    notes: '备注',
    enabled: '是否启用',
    status: '状态',
    actions: '操作',
    all: '全部',
    enabledStatus: '已启用',
    disabledStatus: '已停用',
    enable: '启用',
    disable: '停用',
    editAction: '编辑',
    search: '搜索应用名称、编码或负责人',
    nameRequired: '请填写应用名称。',
    nameTaken: '此应用名称已被使用。',
    codeTaken: '此应用编码已被使用。',
    nameTooLong: '应用名称不能超过 120 个字符。',
    codeTooLong: '应用编码不能超过 64 个字符。',
    ownerTooLong: '负责人不能超过 120 个字符。',
    notesTooLong: '备注不能超过 2000 个字符。',
    codeHint: '选填；填写时全系统唯一。',
    enabledHint: '停用后不能在新的上线申请中选择，历史上线记录不受影响。',
    createdSuccess: '已创建应用“{{name}}”',
    savedSuccess: '已保存应用“{{name}}”',
    enabledSuccess: '已启用应用“{{name}}”',
    disabledSuccess: '已停用应用“{{name}}”',
    enableTitle: '启用“{{name}}”？',
    enableHint: '启用后，该应用可以重新出现在新的上线申请中。',
    disableTitle: '停用“{{name}}”？',
    disableHint:
      '停用后，该应用不能在新的上线申请中选择，历史上线记录不受影响。',
    actionsFor: '“{{name}}”的操作',
    noResults: '没有符合当前筛选条件的应用。',
    emptyHint: '还没有应用。先新建一个应用，之后才能提交上线申请。',
    total: '共 {{count}} 个应用',
  },
  agentManagement: {
    title: 'Agent 管理',
    description: '连接运行环境，管理智能体、技能、模型服务与用量。',
    agents: '智能体',
    runtimes: '运行环境',
    skills: '技能',
    usage: '用量',
    models: '模型服务',
    connectRuntime: '连接运行环境',
    newSkill: '新建技能',
    skillDetail: '技能详情',
  },
  chat: {
    ...agentChat.chat,
    source: {
      askAgent: '从业务页面提问',
    },
  },
};

export default zhCN;
