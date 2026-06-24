import { App, Plugin, PluginSettingTab, Setting, MarkdownView, Notice, Platform, TFile } from 'obsidian';

interface ShareWeChatSettings {
	includeTitle: boolean;
	stripFrontmatter: boolean;
	resolveWikiLinks: boolean;
	addSourceTag: boolean;
	serverUrl: string;
	defaultExpiryDays: number;
}

const DEFAULT_SETTINGS: ShareWeChatSettings = {
	includeTitle: true,
	stripFrontmatter: true,
	resolveWikiLinks: true,
	addSourceTag: false,
	serverUrl: 'https://nas.vonxz.cn',
	defaultExpiryDays: 7,
};

export default class ShareWeChatPlugin extends Plugin {
	settings: ShareWeChatSettings;

	async onload() {
		await this.loadSettings();

		this.addRibbonIcon('share-2', '分享到微信', () => {
			this.shareCurrentNote();
		});

		this.addCommand({
			id: 'share-to-wechat',
			name: '分享到微信',
			icon: 'share-2',
			callback: () => this.shareCurrentNote(),
		});

		this.addCommand({
			id: 'copy-for-wechat',
			name: '复制笔记（微信分享格式）',
			callback: () => this.copyForWeChat(),
		});

		this.addCommand({
			id: 'share-as-online-card',
			name: '分享为在线卡片',
			icon: 'globe',
			callback: () => this.shareAsOnlineCard(),
		});

		this.addSettingTab(new ShareWeChatSettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	getActiveContent(): { content: string; file: TFile | null } | null {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) {
			new Notice('❌ 请先打开要分享的笔记');
			return null;
		}
		return {
			content: view.editor.getValue(),
			file: view.file,
		};
	}

	formatContent(content: string, title?: string): string {
		let text = content;

		// 1. Strip YAML frontmatter
		if (this.settings.stripFrontmatter) {
			text = text.replace(/^---\n[\s\S]*?\n---\n?/, '');
		}

		// 2. Resolve wiki links and embeds
		if (this.settings.resolveWikiLinks) {
			// [[Page|Display]] → Display
			// [[Page]] → Page
			text = text.replace(/!?\[\[([^\]]*?)(?:\|([^\]]*))?\]\]/g, (match, link, alias) => {
				const isEmbed = match.startsWith('!');
				if (isEmbed) {
					// ![[image.png]] → [图片]
					const ext = link.split('.').pop()?.toLowerCase();
					if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'].includes(ext || '')) {
						return `[图片: ${link}]`;
					}
					return `[附件: ${link}]`;
				}
				return alias?.trim() || link.trim();
			});
		}

		// 3. Clean up excessive blank lines
		text = text.replace(/\n{4,}/g, '\n\n\n');

		// 4. Add title header
		if (this.settings.includeTitle && title) {
			text = `# ${title}\n\n${text}`;
		}

		// 5. Add source tag
		if (this.settings.addSourceTag) {
			text = `${text}\n\n---\n📝 来自 Obsidian`;
		}

		return text.trim();
	}

	async shareCurrentNote() {
		const active = this.getActiveContent();
		if (!active) return;

		const formatted = this.formatContent(active.content, active.file?.basename);

		if (Platform.isMobile || Platform.isIosApp) {
			try {
				await navigator.share({
					title: active.file?.basename || 'Obsidian 笔记',
					text: formatted,
				});
			} catch (e: unknown) {
				if (e instanceof Error && e.name !== 'AbortError') {
					new Notice('❌ 分享失败: ' + e.message);
				}
			}
		} else {
			// Desktop: fallback to clipboard
			await this.copyToClipboard(formatted);
		}
	}

	async copyForWeChat() {
		const active = this.getActiveContent();
		if (!active) return;

		const formatted = this.formatContent(active.content, active.file?.basename);
		await this.copyToClipboard(formatted);
	}

	async copyToClipboard(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			new Notice('✅ 已复制到剪贴板，请到微信中粘贴');
		} catch {
			// Fallback for restricted contexts
			const textarea = document.createElement('textarea');
			textarea.value = text;
			document.body.appendChild(textarea);
			textarea.select();
			document.execCommand('copy');
			document.body.removeChild(textarea);
			new Notice('✅ 已复制到剪贴板');
		}
	}

	async shareAsOnlineCard() {
		const active = this.getActiveContent();
		if (!active) return;

		const content = this.formatContent(active.content, undefined);
		const title = active.file?.basename || '无标题';

		new Notice('⏳ 正在上传笔记...');

		try {
			const url = await this.uploadNote(title, content);
			await this.copyToClipboard(url);
			new Notice(`✅ 链接已复制: ${url}`);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : '未知错误';
			new Notice(`❌ 上传失败: ${msg}`);
		}
	}

	async uploadNote(title: string, content: string): Promise<string> {
		const serverUrl = this.settings.serverUrl.replace(/\/+$/, '');
		const expiry_days = this.settings.defaultExpiryDays;

		const resp = await fetch(`${serverUrl}/api/share`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ title, content, expiry_days }),
		});

		if (!resp.ok) {
			const text = await resp.text();
			throw new Error(`服务器返回 ${resp.status}: ${text.slice(0, 100)}`);
		}

		const data = await resp.json();
		if (!data.url) throw new Error('服务器未返回链接');
		return data.url;
	}
}

class ShareWeChatSettingTab extends PluginSettingTab {
	plugin: ShareWeChatPlugin;

	constructor(app: App, plugin: ShareWeChatPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: '分享到微信 — 设置' });

		new Setting(containerEl)
			.setName('添加标题')
			.setDesc('在分享内容顶部添加笔记标题')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.includeTitle)
					.onChange(async (value) => {
						this.plugin.settings.includeTitle = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('去除 Frontmatter')
			.setDesc('移除笔记开头的 YAML 元数据区')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.stripFrontmatter)
					.onChange(async (value) => {
						this.plugin.settings.stripFrontmatter = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('解析内部链接')
			.setDesc('将 [[页面名]] 转换为可读文字，[嵌入] 转为说明标记')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.resolveWikiLinks)
					.onChange(async (value) => {
						this.plugin.settings.resolveWikiLinks = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('添加来源标记')
			.setDesc('在末尾添加 "📝 来自 Obsidian" 标记')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.addSourceTag)
					.onChange(async (value) => {
						this.plugin.settings.addSourceTag = value;
						await this.plugin.saveSettings();
					})
			);

		containerEl.createEl('hr');
		containerEl.createEl('h3', { text: '在线卡片分享' });

		new Setting(containerEl)
			.setName('服务器地址')
			.setDesc('托管笔记的服务器 URL（默认 https://nas.vonxz.cn）')
			.addText((text) =>
				text
					.setValue(this.plugin.settings.serverUrl)
					.onChange(async (value) => {
						this.plugin.settings.serverUrl = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('过期天数')
			.setDesc('分享链接的有效天数（1-30 天）')
			.addText((text) =>
				text
					.setValue(String(this.plugin.settings.defaultExpiryDays))
					.onChange(async (value) => {
						const num = parseInt(value);
						if (num >= 1 && num <= 30) {
							this.plugin.settings.defaultExpiryDays = num;
							await this.plugin.saveSettings();
						}
					})
			);

		containerEl.createEl('hr');

		const usage = containerEl.createEl('div');
		usage.createEl('h3', { text: '使用说明' });
		usage.createEl('p', {
			text: 'Android 手机：打开笔记 → 点击左侧工具栏的分享图标（或使用命令面板）→ 选择"分享到微信" → 在系统分享菜单中选择微信。',
		});
		usage.createEl('p', {
			text: '桌面端：会自动复制到剪贴板，在微信中粘贴即可。',
		});
		usage.createEl('p', {
			text: '可用命令：',
		});
		const cmdList = usage.createEl('ul');
		cmdList.createEl('li', { text: '分享到微信 — 手机端弹出系统分享，桌面端复制到剪贴板' });
		cmdList.createEl('li', { text: '复制笔记（微信分享格式）— 始终复制到剪贴板' });
		cmdList.createEl('li', { text: '分享为在线卡片 — 上传笔记到服务器，生成可点击链接，自动复制到剪贴板' });
	}
}
