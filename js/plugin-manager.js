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
            // Load plugins.txt
            const response = await fetch('plugins/plugins.txt');
            const text = await response.text();
            
            // Parse plugins.txt
            const categories = {};
            const pluginDefinitions = new Map();
            let currentSection = null;

            // First load the base plugin class
            await loadScript('plugins/plugin-base.js');

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

            // Group plugins by category for parallel loading
            const categoryPlugins = {};
            for (const [displayName, {path, category, hasCSS}] of pluginDefinitions) {
                if (!categoryPlugins[category]) {
                    categoryPlugins[category] = [];
                }
                categoryPlugins[category].push({displayName, path, hasCSS});
            }

            // Load plugins in parallel by category
            const loadCategory = async (plugins) => {
                const loadPromises = plugins.flatMap(({displayName, path, hasCSS}) => {
                    const promises = [
                        loadScript(`${path}.js`).catch(error => {
                            throw new Error(`Failed to load plugin script for ${displayName}: ${error.message}`);
                        })
                    ];
                    
                    if (hasCSS) {
                        promises.push(
                            loadCSS(`${path}.css`).catch(error => {
                                throw new Error(`Failed to load CSS for ${displayName}: ${error.message}`);
                            })
                        );
                    }
                    return promises;
                });
                
                await Promise.all(loadPromises);
            };

            // Load categories in parallel
            await Promise.all(
                Object.values(categoryPlugins).map(plugins => loadCategory(plugins))
            );

            // Initialize plugin classes mapping
            for (const [displayName, {className}] of pluginDefinitions) {
                if (!window[className]) {
                    console.error(`Plugin class ${className} not found`);
                    continue;
                }
                this.pluginClasses[displayName] = window[className];
            }

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
}
