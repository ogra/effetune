// Script and CSS loading utilities
export async function loadScript(src) {
    // Check if it's a bundle request
    if (Array.isArray(src)) {
        // Load all scripts in parallel and concatenate
        const responses = await Promise.all(
            src.map(url => 
                fetch(url)
                    .then(r => r.text())
                    .catch(error => {
                        console.error(`Failed to load script: ${url}`, error);
                        return '';
                    })
            )
        );
        const bundledCode = responses.join('\n');
        
        // Create and load the bundled script
        const blob = new Blob([bundledCode], { type: 'text/javascript' });
        const blobUrl = URL.createObjectURL(blob);
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = blobUrl;
            script.onload = () => {
                URL.revokeObjectURL(blobUrl);
                resolve();
            };
            script.onerror = (error) => {
                URL.revokeObjectURL(blobUrl);
                reject(error);
            };
            document.head.appendChild(script);
        });
    }
    
    // Single script loading
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

export async function loadCSS(src) {
    // Check if it's a bundle request
    if (Array.isArray(src)) {
        // Load all CSS in parallel and concatenate
        const responses = await Promise.all(
            src.map(url => 
                fetch(url)
                    .then(r => r.text())
                    .catch(error => {
                        console.error(`Failed to load CSS: ${url}`, error);
                        return '';
                    })
            )
        );
        const bundledCSS = responses.join('\n');
        
        // Create and load the bundled CSS
        const blob = new Blob([bundledCSS], { type: 'text/css' });
        const blobUrl = URL.createObjectURL(blob);
        
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = blobUrl;
            link.onload = () => {
                URL.revokeObjectURL(blobUrl);
                resolve();
            };
            link.onerror = (error) => {
                URL.revokeObjectURL(blobUrl);
                reject(error);
            };
            document.head.appendChild(link);
        });
    }
    
    // Single CSS loading
    return new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = src;
        link.onload = resolve;
        link.onerror = reject;
        document.head.appendChild(link);
    });
}
