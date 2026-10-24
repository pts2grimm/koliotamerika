import * as social from './20261024_150000_social'
import * as migration_20261022_135903_initial from './20261022_135903_initial';

export const migrations = [
  {
    up: migration_20261022_135903_initial.up,
    down: migration_20261022_135903_initial.down,
    name: '20261022_135903_initial'
  },
  {up:social.up,down:social.down,name:'20261024_150000_social'},
];
