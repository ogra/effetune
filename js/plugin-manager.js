import { loadScript, loadCSS } from './script-loader.js';

export class PluginManager {
    constructor() {
        this.pluginClasses = {};
        this.nextPluginId = 1;
        this.effectCategories = {};
    }

    createPlugin(name) {
        const plugin = new this.pluginClasses[name]();
        plugin.id = this.nextPluginId++;
        return plugin;
    }

    async loadPlugins() {
        try {
            console.time('load-resources');
            
            // First load and parse plugins.txt to know what to load
            const pluginsText = await fetch('plugins/plugins.txt').then(r => r.text());
            const { categories, pluginDefinitions } = this.parsePluginsDefinition(pluginsText);

            // Collect all resource URLs
            const jsUrls = ['plugins/plugin-base.js'];
            const cssUrls = [];
            for (const {path, hasCSS} of pluginDefinitions.values()) {
                jsUrls.push(`${path}.js`);
                if (hasCSS) cssUrls.push(`${path}.css`);
            }

            // Load all resources in parallel
            const [jsContents, cssContents] = await Promise.all([
                // Load all JS files
                Promise.all(jsUrls.map(url => 
                    fetch(url)
                        .then(r => r.text())
                        .catch(error => {
                            console.error(`Failed to load JS: ${url}`, error);
                            return '';
                        })
                )),
                // Load all CSS files
                Promise.all(cssUrls.map(url => 
                    fetch(url)
                        .then(r => r.text())
                        .catch(error => {
                            console.error(`Failed to load CSS: ${url}`, error);
                            return '';
                        })
                ))
            ]);

            // Create and load bundles
            const jsBlob = new Blob([jsContents.join('\n')], { type: 'text/javascript' });
            const cssBlob = new Blob([cssContents.join('\n')], { type: 'text/css' });

            // Load bundles in parallel
            await Promise.all([
                new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = URL.createObjectURL(jsBlob);
                    script.onload = () => {
                        URL.revokeObjectURL(script.src);
                        resolve();
                    };
                    script.onerror = reject;
                    document.head.appendChild(script);
                }),
                cssUrls.length > 0 ? new Promise((resolve, reject) => {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = URL.createObjectURL(cssBlob);
                    link.onload = () => {
                        URL.revokeObjectURL(link.href);
                        resolve();
                    };
                    link.onerror = reject;
                    document.head.appendChild(link);
                }) : Promise.resolve()
            ]);

            console.timeEnd('load-resources');

            // Initialize plugins in parallel
            await Promise.all(
                Array.from(pluginDefinitions.entries()).map(async ([displayName, {className}]) => {
                    if (!window[className]) {
                        console.error(`Plugin class ${className} not found`);
                        return;
                    }
                    this.pluginClasses[displayName] = window[className];
                })
            );

            // Store categories
            this.effectCategories = categories;

            console.log('Loaded plugin classes:', Object.keys(this.pluginClasses));
            console.log('Available categories:', categories);

            return {
                pluginClasses: this.pluginClasses,
                effectCategories: this.effectCategories
            };
        } catch (error) {
            console.error('Error loading plugins:', error);
            throw error;
        }
    }

    parsePluginsDefinition(text) {
        const categories = {};
        const pluginDefinitions = new Map();
        let currentSection = null;

        text.split('\n').forEach(line => {
            line = line.trim();
            if (!line || line.startsWith('#')) return;

            if (line === '[categories]') {
                currentSection = 'categories';
            } else if (line === '[plugins]') {
                currentSection = 'plugins';
            } else if (currentSection === 'categories') {
                const [name, description] = line.split(':').map(s => s.trim());
                categories[name] = {
                    description,
                    plugins: []
                };
            } else if (currentSection === 'plugins') {
                const [path, info] = line.split(':').map(s => s.trim());
                const [displayName, category, className, hasCSS] = info.split('|').map(s => s.trim());
                pluginDefinitions.set(displayName, {
                    path: `plugins/${path}`,
                    category,
                    className,
                    hasCSS: hasCSS === 'css'
                });
                categories[category].plugins.push(displayName);
            }
        });

        return { categories, pluginDefinitions };
    }
}
