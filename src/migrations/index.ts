import * as catalogRequests from './20261018_190000_catalog_requests'
import * as catalogTotals from './20261018_160000_catalog_totals'
import * as catalogEvents from './20261018_120000_catalog_events'
import * as billsOfSale from './20261017_180000_bills_of_sale'
import * as consentEvents from './20261017_120000_consent_events'
import * as calculatorEur from './20261012_030000_calculator_eur'
import * as migration_20261012_020000_integrations from './20261012_020000_integrations'
import * as migration_20261010_120440_initial from './20261010_120440_initial';
import * as migration_20261010_135337_customer_accounts from './20261010_135337_customer_accounts';

import * as migration_20261012_010000_contact_details from './20261012_010000_contact_details';

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
  { up: migration_20261012_010000_contact_details.up, down: migration_20261012_010000_contact_details.down, name: '20261012_010000_contact_details' },
  { up: migration_20261012_020000_integrations.up, down: migration_20261012_020000_integrations.down, name: '20261012_020000_integrations' },
  {up:calculatorEur.up,down:calculatorEur.down,name:'20261012_030000_calculator_eur'},
  { up: consentEvents.up, down: consentEvents.down, name: '20261017_120000_consent_events' },
  { up: billsOfSale.up, down: billsOfSale.down, name: '20261017_180000_bills_of_sale' },
  { up: catalogEvents.up, down: catalogEvents.down, name: '20261018_120000_catalog_events' },
  { up: catalogTotals.up, down: catalogTotals.down, name: '20261018_160000_catalog_totals' },
  { up: catalogRequests.up, down: catalogRequests.down, name: '20261018_190000_catalog_requests' },
]
