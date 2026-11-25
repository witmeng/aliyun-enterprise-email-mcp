/** 测试用：若真实工厂被调用则失败 */
export const LIVE_TRANSPORT_GUARD = {
    allowLive: false,
    assertLiveAllowed() {
        if (!this.allowLive) {
            throw new Error('FATAL: 尝试创建真实 SMTP 传输，但当前上下文禁止实连接（测试/安全护栏）。');
        }
    },
};
//# sourceMappingURL=types.js.map