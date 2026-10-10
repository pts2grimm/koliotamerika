import * as migration_20261010_120440_initial from './20261010_120440_initial';
import * as migration_20261010_135337_customer_accounts from './20261010_135337_customer_accounts';

export const migrations = [
  {
    up: migration_20261010_120440_initial.up,
    down: migration_20261010_120440_initial.down,
    name: '20261010_120440_initial',
  },
  {
    up: migration_20261010_135337_customer_accounts.up,
    down: migration_20261010_135337_customer_accounts.down,
    name: '20261010_135337_customer_accounts'
  },
];
