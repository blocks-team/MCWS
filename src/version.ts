import packageInfo from '../package.json';
export const version = packageInfo.version.split('.');
export const versionString = `v${packageInfo.version}`;