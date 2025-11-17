import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SeedAdminMappingCommand } from '../src/commands/seed-admin-mapping.command';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  try {
    const command = app.get(SeedAdminMappingCommand);
    const summary = await command.run();
    if (summary.errors > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('Admin mapping seed execution failed:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  console.error('Unexpected error while running admin mapping seed:', error);
  process.exitCode = 1;
});
