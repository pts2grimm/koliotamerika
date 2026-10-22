import * as migration_20261022_135903_initial from './20261022_135903_initial';

export const migrations = [
  {
    up: migration_20261022_135903_initial.up,
    down: migration_20261022_135903_initial.down,
    name: '20261022_135903_initial'
  },
];
