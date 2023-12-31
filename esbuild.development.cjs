const esbuild = require('esbuild');
const fs = require('fs');
const { join } = require('path');

const { nodeExternalsPlugin } = require('esbuild-node-externals')

const getFilePaths = (list, path) => {
    fs.readdirSync(path).forEach(file => {
        const filePath = join(path, file);
        if (fs.statSync(filePath).isDirectory()) getFilePaths(list, filePath);
        else list.push(filePath);
    });
}
const build = () => {
    const entryPoints = [];
    getFilePaths(entryPoints, './src');
    console.log(`[${new Date().toLocaleString()}] Start building...`);

    Promise.all(entryPoints.map(entryPoint => {
        const outfile =  entryPoint.replace('src', 'lib').replace('.ts', '.mjs');
        return esbuild.build({
            entryPoints: [entryPoint],
            outfile: outfile,
            platform: 'node',
            sourcemap: true,
            plugins: [
                nodeExternalsPlugin()
            ],
            format: 'esm',
            target: ['esnext']
        }).then(() => {
            const content = fs.readFileSync(outfile).toString();
            fs.writeFileSync(outfile, content.replaceAll(/"\..+?"/g, (s) => {
                if (s.endsWith('.json"')) return s;
                return `".${s.slice(2, -1)}.mjs"`;
            }));
        })
    })).then(() => {
        console.log(`[${new Date().toLocaleString()}] Building file successfully`);
    }).catch(err => {
        console.error(err);
    });
}

fs.watch('./src', {
    persistent: true,
    recursive: true
}, build);

build();