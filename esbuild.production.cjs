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

const entryPoints = [];
getFilePaths(entryPoints, './src');

entryPoints.forEach(entryPoint => {
    const outfile = entryPoint.replace('src', 'lib').replace('.ts', '.cjs');
    esbuild.build({
        entryPoints: [entryPoint],
        outfile: outfile,
        minify: true,
        platform: 'node',
        sourcemap: true,
        plugins: [
            nodeExternalsPlugin()
        ],
        format: 'cjs'
    }).then(() => {
        const content = fs.readFileSync(outfile).toString();
        fs.writeFileSync(outfile, content.replaceAll(/"\..+?"/g, (s) => {
            if (s.endsWith('.json"')) return s;
            return `".${s.slice(2, -1)}.cjs"`;
        }));
    }).catch(err => {
        console.error(err);
    });
});

entryPoints.forEach(entryPoint => {
    const outfile = entryPoint.replace('src', 'lib').replace('.ts', '.mjs');
    esbuild.build({
        entryPoints: [entryPoint],
        outfile: outfile,
        minify: true,
        platform: 'node',
        sourcemap: true,
        plugins: [
            nodeExternalsPlugin()
        ],
        format: 'esm'
    }).then(() => {
        const content = fs.readFileSync(outfile).toString();
        fs.writeFileSync(outfile, content.replaceAll(/"\..+?"/g, (s) => {
            if (s.endsWith('.json"')) return s;
            return `".${s.slice(2, -1)}.mjs"`;
        }));
    }).catch(err => {
        console.error(err);
    });
});