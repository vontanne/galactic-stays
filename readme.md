# Galactic Stays

Galactic Stays is a hotel booking application for travelers visiting planets across the galaxy. This educational project uses the SAP Cloud Application Programming Model (CAP), OData V4 services, and SAP Fiori elements applications.

## Features

- **Travelers:** browse hotels and rooms, manage their profile, book stays, pay or cancel reservations, and review hotels after completed stays.
- **Hotel managers:** manage rooms and bookings for their assigned hotel, including cancellations and completed stays.
- **Administrators:** manage planets, hotels, manager assignments, traveler access, and reviews; synchronize planet data from the Star Wars API (SWAPI).

Bookings include capacity and availability checks, 15-minute reservation holds, and cancellation refunds. Payments and refunds are simulated; prices use Galactic Credits (GCR).

## Run locally

Use Node.js 24 (recommended; Node.js 22 is the minimum) and npm. No SAP account is required for local development.

```bash
git clone https://github.com/vontanne/galactic-stays.git
cd galactic-stays
npm ci
npm start
```

Open the [launchpad](http://localhost:4004/launchpad.html). The browser loads SAPUI5 from a CDN, so internet access is required for the UI.

The local database is SQLite in memory. Seed data loads on startup, and changes are lost when the server restarts.

### Demo accounts

Sign in when opening an app that requires a role. Each account uses its username as its password.

| Username | Role          | Access                           |
| -------- | ------------- | -------------------------------- |
| `anakin` | Traveler      | Existing profile and bookings    |
| `padme`  | Traveler      | Create a profile before booking  |
| `lando`  | Hotel manager | Galactic City Hotel              |
| `boba`   | Hotel manager | Mos Espa Grand                   |
| `admin`  | Administrator | Master data and hotel management |

Use separate browser profiles or close the private browsing session before switching accounts, since browsers retain HTTP Basic credentials. The catalog is accessible without signing in locally.

## API and Postman

The [public Postman collection](https://www.postman.com/the-404th-legion/galactic-stays/collection/ywtbwr2/galactic-stays-api) covers the application workflows and includes demo credentials.

Create and select a Postman environment with `baseUrl` set to `http://localhost:4004`. Run the requests in collection order against a freshly started server; restart the server before repeating the full collection. Use the Postman desktop app or the web app with the [Desktop Agent](https://learning.postman.com/docs/getting-started/basics/about-postman-agent/) to reach localhost.

| Service          | Endpoint                     |
| ---------------- | ---------------------------- |
| Catalog          | `/odata/v4/catalog`          |
| Traveler profile | `/odata/v4/traveler`         |
| Booking          | `/odata/v4/booking`          |
| Hotel management | `/odata/v4/hotel-management` |
| Administration   | `/odata/v4/admin`            |

Append `/$metadata` to an endpoint to view its OData schema.

## Checks

```bash
npm test
npm run lint
npm run format:check
```

OPA5 browser tests run separately while the server is running:

- [Hotel catalog](http://localhost:4004/catalog/webapp/test/integration/opaTests.qunit.html): no login required locally.
- [Traveler bookings](http://localhost:4004/traveler-bookings/webapp/test/integration/opaTests.qunit.html): sign in as `anakin`.

## Deploy to SAP BTP

Deployment configuration is prepared for the SAP BTP, Cloud Foundry runtime with SAP HANA Cloud and XSUAA. Deployment has not been tested against live SAP BTP services.

Before deploying:

1. Prepare an SAP BTP subaccount with a Cloud Foundry organization and space, and a running SAP HANA Cloud database mapped to that space.
2. Enable the service entitlements used by `mta.yaml`: SAP HANA Schemas & HDI Containers (`hdi-shared`), Authorization and Trust Management Service (`application`), and Destination Service (`lite`), plus Cloud Foundry runtime memory for the applications.
3. Install Cloud Foundry CLI v8 or later, its [MultiApps plugin](https://github.com/cloudfoundry/multiapps-cli-plugin), and GNU Make 4.2.1 or later.

From the repository root, build the deployment archive. This step does not require an SAP BTP account; `npx` runs the [Cloud MTA Build Tool](https://sap.github.io/cloud-mta-build-tool/usage/).

```bash
npx mbt build -t gen --mtar galactic-stays.mtar
```

Sign in using your Cloud Foundry API endpoint from the SAP BTP cockpit, select your organization and space, and deploy:

```bash
cf login -a <api-endpoint> --sso
cf deploy gen/galactic-stays.mtar
cf app galactic-stays
```

In the SAP BTP cockpit, open **Security → Role Collections** and assign the generated `Admin`, `Traveler`, or `HotelManager` collection to each user. Collection names include the organization and space.

Open the application route shown by `cf app galactic-stays`. Cloud access uses XSUAA login; local demo accounts do not apply. New travelers must create a profile, and managers need hotel assignments in the admin API matching their authenticated user IDs.

See SAP's [Cloud Foundry deployment guide](https://cap.cloud.sap/docs/guides/deploy/to-cf) for account setup and service configuration.

## Project layout

| Path                  | Contents                              |
| --------------------- | ------------------------------------- |
| `db/`                 | CDS data model and seed data          |
| `_i18n/`              | Error messages and UI labels          |
| `srv/`                | OData services and business rules     |
| `app/`                | Fiori applications and OPA5 tests     |
| `test/`               | Backend integration tests             |
| `.deploy/app-router/` | Cloud application router              |
| `.github/`            | Community documentation and templates |

See the [contribution guidelines](.github/CONTRIBUTING.md), use [Discussions](https://github.com/vontanne/galactic-stays/discussions) for questions, and report vulnerabilities through the [security policy](.github/SECURITY.md).

Licensed under the [MIT License](LICENSE).
