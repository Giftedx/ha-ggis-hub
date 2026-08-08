export const GAME_MOUNTS = [
  {
    id: 'wild-haggis-survivors',
    route: '/wild/',
    sourceDir: '../wild-haggis-survivors',
    distDir: 'wild',
    buildCommand: 'npm --prefix ../wild-haggis-survivors run build',
    copyStep: 'copy:whs',
  },
  {
    id: 'just-five-more-minutes',
    route: '/just-five-more-minutes/',
    sourceDir: '../../experiments/just-five-more-minutes',
    distDir: 'just-five-more-minutes',
    buildCommand: 'npm --prefix ../../experiments/just-five-more-minutes run build:hub',
    copyStep: 'copy:jfmm',
  },
];
