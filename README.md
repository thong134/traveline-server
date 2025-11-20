<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Vietnam administrative mapping seed

1. Populate the file `src/data/admin-mapping.json` with an array of mapping definitions. Each entry links one or more legacy units (before the reform) to a single reform unit. You can omit `district`, `ward` or `newCommuneCode` when they are not needed. A few illustrative cases:

```json
[
  {
    "newProvinceCode": "08",
    "old": [
      { "province": "02" },
      { "province": "08" }
    ],
    "note": "Hop nhat toan bo tinh Ha Giang (02) vao tinh Tuyen Quang (08).",
    "resolutionRef": "NQ/2025/QH15-08"
  },
  {
    "newProvinceCode": "31",
    "old": [
      { "province": "30" },
      { "province": "31" }
    ],
    "note": "Sap nhap tinh Hai Duong (30) vao Thanh pho Hai Phong (31).",
    "resolutionRef": "NQ/2025/QH15-HP"
  },
  {
    "newProvinceCode": "01",
    "newCommuneCode": "00070",
    "old": [
      { "province": "01", "district": "002", "ward": "00061" },
      { "province": "01", "district": "002", "ward": "00052" },
      { "province": "01", "district": "002", "ward": "00046" },
      { "province": "01", "district": "002", "ward": "00049" },
      { "province": "01", "district": "002", "ward": "00064" },
      { "province": "01", "district": "002", "ward": "00043" },
      { "province": "01", "district": "002", "ward": "00058" },
      { "province": "01", "district": "002", "ward": "00055" },
      { "province": "01", "district": "002", "ward": "00073" },
      { "province": "01", "district": "001", "ward": "00019" },
      { "province": "01", "district": "002", "ward": "00040" },
      { "province": "01", "district": "002", "ward": "00076" },
      { "province": "01", "district": "002", "ward": "00070" },
      { "province": "01", "district": "002", "ward": "00079" }
    ],
    "note": "Tao phuong Hoan Kiem (00070) tu cac phuong Hang Bac, Hang Bo, Hang Buom, Hang Dao, Hang Gai, Hang Ma, Ly Thai To va mot phan cua Cua Dong, Cua Nam, Dien Bien, Dong Xuan, Hang Bong, Hang Trong, Trang Tien.",
    "resolutionRef": "NQ/2025/QH15-HN"
  }
]
```

   - When a legacy unit is split across multiple reform units, repeat the legacy code in multiple entries and use the `note` field to document the split.
   - The helper APIs under `vn-admin/legacy` and `vn-admin/reform` let you search by name to confirm the correct codes before populating the JSON.

2. Execute the seed command:

```bash
ts-node scripts/run-seed-admin-mapping.ts
```

3. Verify the inserted data by inspecting the database, for example with psql:

```sql
SELECT COUNT(*) AS total_mappings FROM vn_admin_unit_mappings;
SELECT * FROM vn_admin_unit_mappings ORDER BY id DESC LIMIT 10;
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
