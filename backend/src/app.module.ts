import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_PIPE } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';

import { AuthModule } from './auth/auth.module';

import { User } from './auth/entities/user.entity';
import { Role } from './auth/entities/role.entity';
import { RefreshToken } from './auth/entities/refresh-token.entity';
import { Organisation } from './auth/organisations/entities/organisation.entity';
import { OrganisationMember } from './auth/organisations/entities/organisation-member.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        entities: [User, Role, RefreshToken, Organisation, OrganisationMember],
        synchronize: false,
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),

    AuthModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
  ],
})
export class AppModule {}