import * as migration_20261010_120440_initial from './20261010_120440_initial';

export const migrations = [
  {
    up: migration_20261010_120440_initial.up,
    down: migration_20261010_120440_initial.down,
    name: '20261010_120440_initial'
  },
];
